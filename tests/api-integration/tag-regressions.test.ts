import { and, eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import db, { schema } from "../../apps/api/src/database";
import { createApp } from "../../apps/api/src/index";
import assignTagToTask from "../../apps/api/src/tag/controllers/assign-tag-to-task";
import moveTask from "../../apps/api/src/task/controllers/move-task";
import { mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";

beforeEach(resetTestDatabase);
async function fixture() {
  const member = await createWorkspaceMember();
  const { project, columns } = await createProjectFixture({
    workspaceId: member.workspace.id,
  });
  const tasks = await db
    .insert(schema.taskTable)
    .values(
      [1, 2].map((number) => ({
        projectId: project.id,
        title: `Task ${number}`,
        number,
        status: "to-do",
        columnId: columns.todo.id,
      })),
    )
    .returning();
  const tags = await db
    .insert(schema.labelTable)
    .values(
      ["Bug", "Feature"].map((name) => ({
        name,
        color: "red",
        workspaceId: member.workspace.id,
        projectId: project.id,
      })),
    )
    .returning();
  mockAuthenticatedSession(member.user);
  return { ...member, project, tasks, tags, app: createApp().app };
}

describe("backend tag regressions", () => {
  it("returns 409 for a conflicting rename and preserves the palette and copies", async () => {
    const { app, user, tags, tasks } = await fixture();
    const copy = await assignTagToTask(tags[0].id, tasks[0].id, user.id);
    const response = await app.request(`/api/tag/${tags[0].id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Feature", color: "blue" }),
    });
    expect(response.status).toBe(409);
    for (const id of [tags[0].id, copy.id]) {
      expect(
        await db.query.labelTable.findFirst({
          where: eq(schema.labelTable.id, id),
        }),
      ).toMatchObject({ name: "Bug", color: "red" });
    }
  });

  it("attaching a copy to another task preserves the original assignment", async () => {
    const { user, tags, tasks } = await fixture();
    const first = await assignTagToTask(tags[0].id, tasks[0].id, user.id);
    const second = await assignTagToTask(first.id, tasks[1].id, user.id);
    expect(second.taskId).toBe(tasks[1].id);
    expect(
      await db.query.labelTable.findFirst({
        where: eq(schema.labelTable.id, first.id),
      }),
    ).toMatchObject({ taskId: tasks[0].id });
  });

  it("rechecks the project after a concurrent task move commits", async () => {
    const { user, workspace, project, tags, tasks } = await fixture();
    const destination = await createProjectFixture({
      workspaceId: workspace.id,
    });
    let attaching: Promise<unknown> | undefined;
    await db.transaction(async (tx) => {
      await tx
        .update(schema.taskTable)
        .set({
          projectId: destination.project.id,
          columnId: destination.columns.todo.id,
        })
        .where(eq(schema.taskTable.id, tasks[0].id));
      attaching = assignTagToTask(tags[0].id, tasks[0].id, user.id).catch(
        (error) => error,
      );
      await expect
        .poll(
          async () => {
            const result = await db.execute(
              sql`select count(*)::int as count from pg_stat_activity where datname = current_database() and wait_event_type = 'Lock'`,
            );
            return result.rows[0]?.count;
          },
          { timeout: 5000 },
        )
        .toBeGreaterThan(0);
    });
    const result = await attaching;
    expect(result).toMatchObject({ status: 400 });
    expect(
      await db.query.labelTable.findMany({
        where: and(
          eq(schema.labelTable.taskId, tasks[0].id),
          eq(schema.labelTable.projectId, project.id),
        ),
      }),
    ).toHaveLength(0);
  });

  it.each(["", "   "])("rejects an empty tag name %j", async (name) => {
    const { app, project } = await fixture();
    const response = await app.request("/api/tag", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, color: "red", projectId: project.id }),
    });
    expect(response.status).toBe(400);
  });

  it("rejects another workspace's label ID in bulk removal", async () => {
    const { app, tasks } = await fixture();
    const other = await createWorkspaceMember();
    const [label] = await db
      .insert(schema.labelTable)
      .values({ name: "Bug", color: "red", workspaceId: other.workspace.id })
      .returning();
    const response = await app.request("/api/task/bulk", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        taskIds: [tasks[0].id],
        operation: "removeLabel",
        value: label.id,
      }),
    });
    expect(response.status).toBe(400);
  });
  it("rolls back palette deletion when deleting its task copies fails", async () => {
    const { app, user, tags, tasks } = await fixture();
    const copy = await assignTagToTask(tags[0].id, tasks[0].id, user.id);
    await db.execute(
      sql`CREATE FUNCTION fail_tag_copy_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD.task_id IS NOT NULL THEN RAISE EXCEPTION 'simulated copy deletion failure'; END IF; RETURN OLD; END $$`,
    );
    await db.execute(
      sql`CREATE TRIGGER fail_tag_copy_delete BEFORE DELETE ON label FOR EACH ROW EXECUTE FUNCTION fail_tag_copy_delete()`,
    );
    try {
      const response = await app.request(`/api/tag/${tags[0].id}`, {
        method: "DELETE",
      });
      expect(response.status).toBe(500);
      for (const id of [tags[0].id, copy.id]) {
        expect(
          await db.query.labelTable.findFirst({
            where: eq(schema.labelTable.id, id),
          }),
        ).toBeDefined();
      }
    } finally {
      await db.execute(sql`DROP TRIGGER fail_tag_copy_delete ON label`);
      await db.execute(sql`DROP FUNCTION fail_tag_copy_delete()`);
    }
  });
  it("rolls back a move if recording stripped tags fails", async () => {
    const { user, workspace, project, tags, tasks } = await fixture();
    const destination = await createProjectFixture({
      workspaceId: workspace.id,
    });
    const copy = await assignTagToTask(tags[0].id, tasks[0].id, user.id);
    await db.execute(
      sql`CREATE FUNCTION fail_tag_removal_activity() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.type = 'label_unassigned' THEN RAISE EXCEPTION 'simulated activity failure'; END IF; RETURN NEW; END $$`,
    );
    await db.execute(
      sql`CREATE TRIGGER fail_tag_removal_activity BEFORE INSERT ON activity FOR EACH ROW EXECUTE FUNCTION fail_tag_removal_activity()`,
    );
    try {
      await expect(
        moveTask({
          taskId: tasks[0].id,
          destinationProjectId: destination.project.id,
          currentUserId: user.id,
        }),
      ).rejects.toThrow();
      expect(
        await db.query.taskTable.findFirst({
          where: eq(schema.taskTable.id, tasks[0].id),
        }),
      ).toMatchObject({ projectId: project.id });
      expect(
        await db.query.labelTable.findFirst({
          where: eq(schema.labelTable.id, copy.id),
        }),
      ).toBeDefined();
    } finally {
      await db.execute(sql`DROP TRIGGER fail_tag_removal_activity ON activity`);
      await db.execute(sql`DROP FUNCTION fail_tag_removal_activity()`);
    }
  });

  it("rejects one of two overlapping moves instead of using a stale source project", async () => {
    const { user, workspace, tasks } = await fixture();
    const a = await createProjectFixture({ workspaceId: workspace.id });
    const b = await createProjectFixture({ workspaceId: workspace.id });
    let moves: Promise<unknown>[] = [];
    await db.transaction(async (tx) => {
      await tx
        .select()
        .from(schema.taskTable)
        .where(eq(schema.taskTable.id, tasks[0].id))
        .for("update");
      moves = [a, b].map(({ project }) =>
        moveTask({
          taskId: tasks[0].id,
          destinationProjectId: project.id,
          currentUserId: user.id,
        }).catch((error) => error),
      );
      await expect
        .poll(
          async () => {
            const result = await db.execute(
              sql`select count(*)::int as count from pg_stat_activity where datname = current_database() and wait_event_type = 'Lock'`,
            );
            return result.rows[0]?.count;
          },
          { timeout: 5000 },
        )
        .toBeGreaterThanOrEqual(2);
    });
    const results = await Promise.all(moves);
    expect(results.filter((result) => result instanceof Error)).toHaveLength(1);
    expect(results.find((result) => result instanceof Error)).toMatchObject({
      status: 409,
    });
  });
});
