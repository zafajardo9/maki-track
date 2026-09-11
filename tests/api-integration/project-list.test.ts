import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import db, { schema } from "../../apps/api/src/database";
import { createApp } from "../../apps/api/src/index";
import { mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";

type ProjectListEntry = typeof schema.projectTable.$inferSelect & {
  statistics: {
    completionPercentage: number;
    totalTasks: number;
    completedTasks: number;
    openTasks: number;
    overdueTasks: number;
    byPriority: Record<string, number>;
    dueDate: string | null;
  };
  tasks?: unknown;
};

async function seedTasks(
  projectId: string,
  tasks: {
    title: string;
    status: string;
    dueDate?: Date;
    number: number;
    priority?: string;
  }[],
) {
  for (const task of tasks) {
    await db.insert(schema.taskTable).values({
      projectId,
      title: task.title,
      status: task.status,
      dueDate: task.dueDate ?? null,
      number: task.number,
      ...(task.priority ? { priority: task.priority } : {}),
    });
  }
}

describe("API integration: project list payload", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it("does not embed task rows in the project list response", async () => {
    const member = await createWorkspaceMember();
    const { project } = await createProjectFixture({
      workspaceId: member.workspace.id,
    });

    await seedTasks(project.id, [
      { title: "First", status: "to-do", number: 1 },
      { title: "Second", status: "done", number: 2 },
      { title: "Third", status: "archived", number: 3 },
    ]);

    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const response = await app.request(
      `/api/project?workspaceId=${member.workspace.id}`,
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as ProjectListEntry[];
    expect(payload).toHaveLength(1);

    // The list endpoint is a summary view. Task rows must not ride along:
    // the payload grows without bound as a project fills up.
    expect(payload[0].tasks).toBeUndefined();
  });

  it("still reports accurate task statistics without embedding tasks", async () => {
    const member = await createWorkspaceMember();
    const { project } = await createProjectFixture({
      workspaceId: member.workspace.id,
    });

    const earliest = new Date("2026-01-10T00:00:00.000Z");
    const later = new Date("2026-03-01T00:00:00.000Z");

    await seedTasks(project.id, [
      { title: "Open", status: "to-do", dueDate: later, number: 1 },
      { title: "Closed", status: "done", dueDate: earliest, number: 2 },
      { title: "Filed", status: "archived", number: 3 },
      { title: "Doing", status: "in-progress", number: 4 },
    ]);

    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const response = await app.request(
      `/api/project?workspaceId=${member.workspace.id}`,
    );
    const payload = (await response.json()) as ProjectListEntry[];

    // `done` is the only final column, so one of the three tasks that sit in a
    // column is complete. `archived` is a virtual bucket rather than a column,
    // so it stays out of the completion population entirely while still being
    // counted in totalTasks.
    expect(payload[0].statistics).toMatchObject({
      totalTasks: 4,
      completedTasks: 1,
      openTasks: 2,
      completionPercentage: 33,
    });
    // Only open tasks count, and "Closed" is done and carries the earliest
    // date, so the soonest open due date is the later one.
    expect(new Date(payload[0].statistics.dueDate as string)).toEqual(later);
  });

  it("follows column.isFinal instead of a hardcoded done slug", async () => {
    const member = await createWorkspaceMember();
    const { project, columns } = await createProjectFixture({
      workspaceId: member.workspace.id,
    });

    // The default "Done" column stops being final and "In Review" becomes
    // final. Both are ordinary edits a user can make through the column
    // editor, and the board immediately reflects them.
    await db
      .update(schema.columnTable)
      .set({ isFinal: false })
      .where(eq(schema.columnTable.id, columns.done.id));
    await db
      .update(schema.columnTable)
      .set({ isFinal: true })
      .where(eq(schema.columnTable.id, columns.inReview.id));

    await seedTasks(project.id, [
      { title: "Reviewed", status: "in-review", number: 1 },
      { title: "Done but no longer final", status: "done", number: 2 },
      { title: "Still open", status: "to-do", number: 3 },
    ]);

    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const response = await app.request(
      `/api/project?workspaceId=${member.workspace.id}`,
    );
    const payload = (await response.json()) as ProjectListEntry[];

    expect(payload[0].statistics).toMatchObject({
      totalTasks: 3,
      completedTasks: 1,
      openTasks: 2,
      completionPercentage: 33,
    });
  });

  it("counts only open tasks as overdue", async () => {
    const member = await createWorkspaceMember();
    const { project } = await createProjectFixture({
      workspaceId: member.workspace.id,
    });

    const past = new Date("2020-01-01T00:00:00.000Z");

    await seedTasks(project.id, [
      { title: "Late and open", status: "to-do", dueDate: past, number: 1 },
      { title: "Late but complete", status: "done", dueDate: past, number: 2 },
      { title: "Late but filed", status: "archived", dueDate: past, number: 3 },
    ]);

    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const response = await app.request(
      `/api/project?workspaceId=${member.workspace.id}`,
    );
    const payload = (await response.json()) as ProjectListEntry[];

    // A completed or filed task with a past due date is not outstanding work.
    expect(payload[0].statistics).toMatchObject({ overdueTasks: 1 });
  });

  it("breaks tasks down by priority across the whole project", async () => {
    const member = await createWorkspaceMember();
    const { project } = await createProjectFixture({
      workspaceId: member.workspace.id,
    });

    await seedTasks(project.id, [
      { title: "Urgent one", status: "to-do", number: 1, priority: "urgent" },
      {
        title: "Urgent two",
        status: "in-progress",
        number: 2,
        priority: "urgent",
      },
      { title: "Low one", status: "to-do", number: 3, priority: "low" },
      // Parked work still belongs to the priority breakdown.
      { title: "Planned high", status: "planned", number: 4, priority: "high" },
    ]);

    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const response = await app.request(
      `/api/project?workspaceId=${member.workspace.id}`,
    );
    const payload = (await response.json()) as ProjectListEntry[];

    expect(payload[0].statistics.byPriority).toEqual({
      urgent: 2,
      low: 1,
      high: 1,
    });
  });

  it("reports zeroed statistics for a project with no tasks", async () => {
    const member = await createWorkspaceMember();
    await createProjectFixture({ workspaceId: member.workspace.id });

    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const response = await app.request(
      `/api/project?workspaceId=${member.workspace.id}`,
    );
    const payload = (await response.json()) as ProjectListEntry[];

    expect(payload[0].statistics).toMatchObject({
      totalTasks: 0,
      completionPercentage: 0,
      dueDate: null,
    });
    expect(payload[0].tasks).toBeUndefined();
  });

  it("keeps statistics isolated per project", async () => {
    const member = await createWorkspaceMember();
    const { project: alpha } = await createProjectFixture({
      workspaceId: member.workspace.id,
      name: "Alpha",
      slug: "alpha",
    });
    const { project: beta } = await createProjectFixture({
      workspaceId: member.workspace.id,
      name: "Beta",
      slug: "beta",
    });

    await seedTasks(alpha.id, [
      { title: "A1", status: "done", number: 1 },
      { title: "A2", status: "to-do", number: 2 },
    ]);
    await seedTasks(beta.id, [{ title: "B1", status: "done", number: 1 }]);

    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const response = await app.request(
      `/api/project?workspaceId=${member.workspace.id}`,
    );
    const payload = (await response.json()) as ProjectListEntry[];

    const byName = new Map(payload.map((p) => [p.name, p]));
    expect(byName.get("Alpha")?.statistics).toMatchObject({
      totalTasks: 2,
      completionPercentage: 50,
    });
    expect(byName.get("Beta")?.statistics).toMatchObject({
      totalTasks: 1,
      completionPercentage: 100,
    });
  });
});
