import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import db, { schema } from "../../apps/api/src/database";
import { createApp } from "../../apps/api/src/index";
import getWorkspaceTasks from "../../apps/api/src/workspace/controllers/get-workspace-tasks";
import { mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";

const now = new Date("2026-09-15T00:00:00Z");
const day = 86400000;

async function createTeammate(workspaceId: string) {
  const userId = `user-${randomUUID()}`;
  const [user] = await db
    .insert(schema.userTable)
    .values({
      id: userId,
      email: `${userId}@example.com`,
      emailVerified: true,
      name: "Teammate",
    })
    .returning();
  await db.insert(schema.workspaceUserTable).values({
    workspaceId,
    userId: user.id,
    role: "member",
    joinedAt: new Date(),
  });
  return user;
}

describe("Workspace tasks", () => {
  beforeEach(resetTestDatabase);

  async function seed() {
    const member = await createWorkspaceMember();
    const teammate = await createTeammate(member.workspace.id);
    const { project, columns } = await createProjectFixture({
      workspaceId: member.workspace.id,
    });
    // A custom final column must be excluded regardless of its status name.
    await db
      .update(schema.columnTable)
      .set({ isFinal: true })
      .where(eq(schema.columnTable.id, columns.inReview.id));

    const seedTask = (
      number: number,
      {
        offset = null as number | null,
        priority = "low",
        status = "to-do",
        userId = member.user.id as string | null,
        projectId = project.id,
      }: {
        offset?: number | null;
        priority?: string;
        status?: string;
        userId?: string | null;
        projectId?: string;
      } = {},
    ) =>
      db.insert(schema.taskTable).values({
        projectId,
        number,
        title: `Task ${number}`,
        status,
        priority,
        userId,
        dueDate: offset === null ? null : new Date(now.getTime() + offset),
      });

    // The ranked set: every ordering key is exercised.
    await seedTask(1, { offset: -10 * day, priority: "urgent" });
    await seedTask(2, { offset: -3 * day, priority: "low" });
    await seedTask(3, { offset: -3 * day, priority: "urgent" });
    await seedTask(4, { offset: 2 * day, priority: "low" });
    await seedTask(5, { offset: 2 * day, priority: "urgent" });
    await seedTask(6, { priority: "urgent" });
    await seedTask(7, { priority: "no-priority" });

    // Excluded from both scopes: final column, virtual status, archived project.
    await seedTask(8, { offset: -day, status: "done" });
    await seedTask(9, { offset: -day, status: "planned" });
    await seedTask(10, { offset: -day, status: "in-review" });
    const archived = await createProjectFixture({
      workspaceId: member.workspace.id,
    });
    await db
      .update(schema.projectTable)
      .set({ archivedAt: now })
      .where(eq(schema.projectTable.id, archived.project.id));
    await seedTask(11, { offset: -day, projectId: archived.project.id });

    // Another workspace's work must never leak in.
    const other = await createWorkspaceMember();
    const foreign = await createProjectFixture({
      workspaceId: other.workspace.id,
    });
    await seedTask(12, { offset: -day, projectId: foreign.project.id });

    // Visible only under `all`. Distinct priorities keep the tie-break on
    // priority rather than on a random UUID.
    await seedTask(13, { offset: -day, userId: teammate.id });
    await seedTask(14, { offset: -day, priority: "no-priority", userId: null });

    return { member, teammate };
  }

  it("ranks overdue first, then due date, then priority, with undated work last", async () => {
    const { member } = await seed();
    const result = await getWorkspaceTasks(
      member.workspace.id,
      member.user.id,
      { scope: "mine", limit: 8 },
      now,
    );

    expect(
      result.tasks.map((task) => ({
        number: task.number,
        priority: task.priority,
      })),
    ).toEqual([
      { number: 1, priority: "urgent" },
      { number: 3, priority: "urgent" },
      { number: 2, priority: "low" },
      { number: 5, priority: "urgent" },
      { number: 4, priority: "low" },
      { number: 6, priority: "urgent" },
      { number: 7, priority: "no-priority" },
    ]);
    expect(result.tasks[0]).not.toHaveProperty("description");
    expect(result.tasks[0]).toMatchObject({
      projectName: "Integration Project",
      statusName: "To Do",
    });
  });

  it("scopes open work to the caller without leaking final, archived, or foreign tasks", async () => {
    const { member } = await seed();
    const result = await getWorkspaceTasks(
      member.workspace.id,
      member.user.id,
      { scope: "mine", limit: 20 },
      now,
    );

    expect(result.total).toBe(7);
    expect(result.tasks.map((task) => task.number)).toEqual([
      1, 3, 2, 5, 4, 6, 7,
    ]);
  });

  it("widens `all` to every member but keeps the same exclusions and order", async () => {
    const { member } = await seed();
    const result = await getWorkspaceTasks(
      member.workspace.id,
      member.user.id,
      { scope: "all", limit: 20 },
      now,
    );

    expect(result.total).toBe(9);
    expect(result.tasks.map((task) => task.number)).toEqual([
      1, 3, 2, 13, 14, 5, 4, 6, 7,
    ]);
  });

  it("caps the rows without capping the total", async () => {
    const { member } = await seed();
    const result = await getWorkspaceTasks(
      member.workspace.id,
      member.user.id,
      { scope: "mine", limit: 3 },
      now,
    );

    expect(result.tasks).toHaveLength(3);
    expect(result.total).toBe(7);
  });

  it("allows members to read their workspace and denies another workspace", async () => {
    const member = await createWorkspaceMember();
    const other = await createWorkspaceMember();
    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const response = await app.request(
      `/api/workspace/${member.workspace.id}/tasks`,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      scope: "mine",
      total: 0,
      tasks: [],
    });

    const widened = await app.request(
      `/api/workspace/${member.workspace.id}/tasks?scope=all&limit=5`,
    );
    expect(widened.status).toBe(200);
    expect((await widened.json()).scope).toBe("all");

    const denied = await app.request(
      `/api/workspace/${other.workspace.id}/tasks`,
    );
    expect(denied.status).toBe(403);

    const invalid = await app.request(
      `/api/workspace/${member.workspace.id}/tasks?limit=999`,
    );
    expect(invalid.status).toBe(400);
  });
});
