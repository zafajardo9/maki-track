import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import db, { schema } from "../../apps/api/src/database";
import { createApp } from "../../apps/api/src/index";
import getProjects from "../../apps/api/src/project/controllers/get-projects";
import getWorkspaceSchedule from "../../apps/api/src/workspace/controllers/get-workspace-schedule";
import { mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";

const now = new Date("2026-09-15T00:00:00Z");
const day = 86400000;

describe("Workspace schedule", () => {
  beforeEach(resetTestDatabase);

  it("scopes open work, handles date boundaries and caps lists without capping counts", async () => {
    const member = await createWorkspaceMember();
    const { project, columns } = await createProjectFixture({
      workspaceId: member.workspace.id,
    });
    const other = await createWorkspaceMember();
    const foreign = await createProjectFixture({
      workspaceId: other.workspace.id,
    });
    const archived = await createProjectFixture({
      workspaceId: member.workspace.id,
    });
    await db
      .update(schema.projectTable)
      .set({ archivedAt: now })
      .where(eq(schema.projectTable.id, archived.project.id));
    // A custom final column must be excluded regardless of its status name.
    await db
      .update(schema.columnTable)
      .set({ isFinal: true })
      .where(eq(schema.columnTable.id, columns.inReview.id));
    const seed = (
      number: number,
      offset: number | null,
      status = "to-do",
      projectId = project.id,
    ) =>
      db.insert(schema.taskTable).values({
        projectId,
        number,
        title: `Task ${number}`,
        status,
        dueDate: offset === null ? null : new Date(now.getTime() + offset),
      });
    for (let index = 1; index <= 10; index++) await seed(index, -index * day);
    await seed(11, 0);
    await seed(12, 7 * day - 1);
    await seed(13, 7 * day);
    await seed(14, null);
    await seed(15, -day, "in-review");
    await seed(16, -day, "planned");
    await seed(17, -day, "archived");
    await seed(18, -day, "to-do", foreign.project.id);
    await seed(19, -day, "to-do", archived.project.id);
    const result = await getWorkspaceSchedule(member.workspace.id, now);
    expect(result.overdue).toBe(10);
    expect(result.upcoming).toBe(2);
    expect(result.noDueDate).toBe(1);
    expect(result.overdueTasks.map((task) => task.number)).toEqual([
      10, 9, 8, 7, 6, 5, 4, 3,
    ]);
    expect(result.upcomingTasks.map((task) => task.number)).toEqual([11, 12]);
    expect(result.overdueTasks[0]).not.toHaveProperty("description");
    const projects = await getProjects(member.workspace.id);
    expect(projects[0]?.statistics.dueDate?.toISOString()).toBe(
      result.overdueTasks[0]?.dueDate?.toISOString(),
    );
  });

  it("allows members to read their workspace and denies another workspace", async () => {
    const member = await createWorkspaceMember();
    const other = await createWorkspaceMember();
    mockAuthenticatedSession(member.user);
    const { app } = createApp();
    const response = await app.request(
      `/api/workspace/${member.workspace.id}/schedule`,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      overdue: 0,
      upcoming: 0,
      noDueDate: 0,
      overdueTasks: [],
      upcomingTasks: [],
    });
    const denied = await app.request(
      `/api/workspace/${other.workspace.id}/schedule`,
    );
    expect(denied.status).toBe(403);
  });
});
