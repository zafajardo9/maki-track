import { and, eq, isNull } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import db, { schema } from "../../apps/api/src/database";
import { importLabelsForTask as importGiteaLabels } from "../../apps/api/src/gitea-integration/controllers/import-gitea-issues";
import { importLabelsForTask as importGitHubLabels } from "../../apps/api/src/github-integration/controllers/import-issues";
import { createApp } from "../../apps/api/src/index";
import { migrateWorkspaceRoleTagStatements } from "../../apps/api/src/utils/migrate-workspace-role-tag-statements";
import { mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";

type TestApp = ReturnType<typeof createApp>["app"];

async function seedTask(
  projectId: string,
  userId: string,
  columnId: string,
  number = 1,
) {
  const [task] = await db
    .insert(schema.taskTable)
    .values({
      projectId,
      userId,
      title: `Task ${number}`,
      status: "to-do",
      columnId,
      priority: "medium",
      number,
      position: number,
    })
    .returning();
  return task;
}

async function createTagViaApi(
  app: TestApp,
  body: { name: string; color: string; projectId: string },
) {
  return app.request("/api/tag", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("API integration: project tags", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  describe("creation and scoping", () => {
    it("creates a tag scoped to its project and lists it there", async () => {
      const member = await createWorkspaceMember();
      const { project } = await createProjectFixture({
        workspaceId: member.workspace.id,
      });

      mockAuthenticatedSession(member.user);
      const { app } = createApp();

      const response = await createTagViaApi(app, {
        name: "Bug",
        color: "#ef4444",
        projectId: project.id,
      });
      expect(response.status).toBe(200);
      const payload =
        (await response.json()) as typeof schema.labelTable.$inferSelect;

      expect(payload).toMatchObject({
        name: "Bug",
        color: "#ef4444",
        projectId: project.id,
        workspaceId: member.workspace.id,
        taskId: null,
      });

      const listResponse = await app.request(`/api/tag/project/${project.id}`);
      expect(listResponse.status).toBe(200);
      const listed = (await listResponse.json()) as Array<
        typeof schema.labelTable.$inferSelect
      >;
      expect(listed).toHaveLength(1);
      expect(listed[0].id).toBe(payload.id);
    });

    it("allows the same tag name in two projects as distinct rows", async () => {
      const member = await createWorkspaceMember();
      const projectA = await createProjectFixture({
        workspaceId: member.workspace.id,
      });
      const projectB = await createProjectFixture({
        workspaceId: member.workspace.id,
      });

      mockAuthenticatedSession(member.user);
      const { app } = createApp();

      const first = await createTagViaApi(app, {
        name: "Bug",
        color: "#ef4444",
        projectId: projectA.project.id,
      });
      expect(first.status).toBe(200);
      const second = await createTagViaApi(app, {
        name: "Bug",
        color: "#ef4444",
        projectId: projectB.project.id,
      });
      expect(second.status).toBe(200);

      const firstPayload = (await first.json()) as { id: string };
      const secondPayload = (await second.json()) as { id: string };
      expect(secondPayload.id).not.toBe(firstPayload.id);

      const rows = await db.query.labelTable.findMany({
        where: eq(schema.labelTable.name, "Bug"),
      });
      expect(rows).toHaveLength(2);
    });

    it("resolves a duplicate tag name in the same project to the existing row", async () => {
      const member = await createWorkspaceMember();
      const { project } = await createProjectFixture({
        workspaceId: member.workspace.id,
      });

      mockAuthenticatedSession(member.user);
      const { app } = createApp();

      const first = await createTagViaApi(app, {
        name: "Bug",
        color: "#ef4444",
        projectId: project.id,
      });
      const duplicate = await createTagViaApi(app, {
        name: "Bug",
        color: "#22c55e",
        projectId: project.id,
      });
      expect(duplicate.status).toBe(200);

      const firstPayload = (await first.json()) as { id: string };
      const duplicatePayload = (await duplicate.json()) as { id: string };
      expect(duplicatePayload.id).toBe(firstPayload.id);

      const rows = await db.query.labelTable.findMany({
        where: and(
          eq(schema.labelTable.projectId, project.id),
          eq(schema.labelTable.name, "Bug"),
        ),
      });
      expect(rows).toHaveLength(1);
    });

    it("allows the same name as a workspace label in both scopes", async () => {
      const member = await createWorkspaceMember();
      const { project } = await createProjectFixture({
        workspaceId: member.workspace.id,
      });

      mockAuthenticatedSession(member.user);
      const { app } = createApp();

      const labelResponse = await app.request("/api/label", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Bug",
          color: "#ef4444",
          workspaceId: member.workspace.id,
        }),
      });
      expect(labelResponse.status).toBe(200);

      const tagResponse = await createTagViaApi(app, {
        name: "Bug",
        color: "#ef4444",
        projectId: project.id,
      });
      expect(tagResponse.status).toBe(200);

      const workspaceLabels = await db.query.labelTable.findMany({
        where: and(
          eq(schema.labelTable.workspaceId, member.workspace.id),
          isNull(schema.labelTable.taskId),
          isNull(schema.labelTable.projectId),
        ),
      });
      expect(workspaceLabels).toHaveLength(1);
      expect(workspaceLabels[0].projectId).toBeNull();

      const projectTags = await db.query.labelTable.findMany({
        where: eq(schema.labelTable.projectId, project.id),
      });
      expect(projectTags).toHaveLength(1);
    });

    it("keeps tags out of the workspace label list endpoint", async () => {
      const member = await createWorkspaceMember();
      const { project } = await createProjectFixture({
        workspaceId: member.workspace.id,
      });

      mockAuthenticatedSession(member.user);
      const { app } = createApp();

      await app.request("/api/label", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Feature",
          color: "#3b82f6",
          workspaceId: member.workspace.id,
        }),
      });
      await createTagViaApi(app, {
        name: "Bug",
        color: "#ef4444",
        projectId: project.id,
      });

      const response = await app.request(
        `/api/label/workspace/${member.workspace.id}`,
      );
      expect(response.status).toBe(200);
      const listed = (await response.json()) as Array<{
        name: string;
        projectId: string | null;
      }>;
      expect(listed).toHaveLength(1);
      expect(listed[0].name).toBe("Feature");
      expect(listed[0].projectId).toBeNull();
    });

    it("resolves duplicate workspace label creation to the existing row", async () => {
      const member = await createWorkspaceMember();

      mockAuthenticatedSession(member.user);
      const { app } = createApp();

      const first = await app.request("/api/label", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Bug",
          color: "#ef4444",
          workspaceId: member.workspace.id,
        }),
      });
      expect(first.status).toBe(200);
      const duplicate = await app.request("/api/label", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Bug",
          color: "#22c55e",
          workspaceId: member.workspace.id,
        }),
      });
      expect(duplicate.status).toBe(200);

      const firstPayload = (await first.json()) as { id: string };
      const duplicatePayload = (await duplicate.json()) as { id: string };
      expect(duplicatePayload.id).toBe(firstPayload.id);

      const rows = await db.query.labelTable.findMany({
        where: and(
          eq(schema.labelTable.workspaceId, member.workspace.id),
          eq(schema.labelTable.name, "Bug"),
        ),
      });
      expect(rows).toHaveLength(1);
    });
  });

  describe("scope-aware cascades", () => {
    async function seedBothScopes(member: {
      user: { id: string };
      workspace: { id: string };
    }) {
      const { project, columns } = await createProjectFixture({
        workspaceId: member.workspace.id,
      });
      const taskForLabel = await seedTask(
        project.id,
        member.user.id,
        columns.todo.id,
        1,
      );
      const taskForTag = await seedTask(
        project.id,
        member.user.id,
        columns.todo.id,
        2,
      );

      const [workspaceLabel] = await db
        .insert(schema.labelTable)
        .values({
          name: "Bug",
          color: "#ef4444",
          workspaceId: member.workspace.id,
          taskId: null,
          projectId: null,
        })
        .returning();
      await db.insert(schema.labelTable).values({
        name: "Bug",
        color: "#ef4444",
        workspaceId: member.workspace.id,
        taskId: taskForLabel.id,
        projectId: null,
      });

      mockAuthenticatedSession(member.user);
      const { app } = createApp();
      const tagResponse = await createTagViaApi(app, {
        name: "Bug",
        color: "#ef4444",
        projectId: project.id,
      });
      const tag =
        (await tagResponse.json()) as typeof schema.labelTable.$inferSelect;
      const attachResponse = await app.request(`/api/tag/${tag.id}/task`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ taskId: taskForTag.id }),
      });
      expect(attachResponse.status).toBe(200);

      return { project, taskForLabel, taskForTag, workspaceLabel, tag, app };
    }

    it("renaming a tag cascades only to its copies in its project", async () => {
      const member = await createWorkspaceMember();
      const { workspaceLabel, taskForLabel, taskForTag, tag, app } =
        await seedBothScopes(member);

      const response = await app.request(`/api/tag/${tag.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Critical", color: "#b91c1c" }),
      });
      expect(response.status).toBe(200);

      const tagRow = await db.query.labelTable.findFirst({
        where: eq(schema.labelTable.id, tag.id),
      });
      expect(tagRow).toMatchObject({ name: "Critical", color: "#b91c1c" });

      // The tag copy on the task follows the rename and keeps its scope.
      const renamedTagCopy = await db.query.labelTable.findFirst({
        where: and(
          eq(schema.labelTable.taskId, taskForTag.id),
          eq(schema.labelTable.name, "Critical"),
        ),
      });
      expect(renamedTagCopy).toMatchObject({
        name: "Critical",
        color: "#b91c1c",
        projectId: tagRow?.projectId,
      });
      expect(renamedTagCopy?.projectId).not.toBeNull();

      // The same-named workspace label and its copy are untouched.
      const labelRow = await db.query.labelTable.findFirst({
        where: eq(schema.labelTable.id, workspaceLabel.id),
      });
      expect(labelRow).toMatchObject({ name: "Bug", color: "#ef4444" });
      const labelCopy = await db.query.labelTable.findFirst({
        where: and(
          eq(schema.labelTable.taskId, taskForLabel.id),
          eq(schema.labelTable.name, "Bug"),
        ),
      });
      expect(labelCopy).toMatchObject({ name: "Bug", color: "#ef4444" });
      expect(labelCopy?.projectId).toBeNull();
    });

    it("renaming a workspace label does not touch a same-named tag", async () => {
      const member = await createWorkspaceMember();
      const { workspaceLabel, taskForTag, tag, app } =
        await seedBothScopes(member);

      const response = await app.request(`/api/label/${workspaceLabel.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Urgent", color: "#f97316" }),
      });
      expect(response.status).toBe(200);

      const tagRow = await db.query.labelTable.findFirst({
        where: eq(schema.labelTable.id, tag.id),
      });
      expect(tagRow).toMatchObject({ name: "Bug", color: "#ef4444" });

      const tagCopy = await db.query.labelTable.findFirst({
        where: and(
          eq(schema.labelTable.taskId, taskForTag.id),
          eq(schema.labelTable.name, "Bug"),
        ),
      });
      expect(tagCopy).toBeDefined();
      expect(tagCopy?.projectId).not.toBeNull();
    });

    it("deleting a tag removes its copies but keeps same-named workspace labels", async () => {
      const member = await createWorkspaceMember();
      const { workspaceLabel, taskForLabel, taskForTag, tag, app } =
        await seedBothScopes(member);

      const response = await app.request(`/api/tag/${tag.id}`, {
        method: "DELETE",
      });
      expect(response.status).toBe(200);

      const tagRows = await db.query.labelTable.findMany({
        where: and(
          eq(schema.labelTable.projectId, tag.projectId),
          eq(schema.labelTable.name, "Bug"),
        ),
      });
      expect(tagRows).toHaveLength(0);

      const tagCopy = await db.query.labelTable.findFirst({
        where: and(
          eq(schema.labelTable.taskId, taskForTag.id),
          eq(schema.labelTable.name, "Bug"),
        ),
      });
      expect(tagCopy).toBeUndefined();

      const labelRow = await db.query.labelTable.findFirst({
        where: eq(schema.labelTable.id, workspaceLabel.id),
      });
      expect(labelRow).toBeDefined();
      const labelCopy = await db.query.labelTable.findFirst({
        where: eq(schema.labelTable.taskId, taskForLabel.id),
      });
      expect(labelCopy).toBeDefined();
    });

    it("deleting a workspace label keeps same-named tags and their copies", async () => {
      const member = await createWorkspaceMember();
      const { workspaceLabel, taskForTag, tag, app } =
        await seedBothScopes(member);

      const response = await app.request(`/api/label/${workspaceLabel.id}`, {
        method: "DELETE",
      });
      expect(response.status).toBe(200);

      const labelRow = await db.query.labelTable.findFirst({
        where: eq(schema.labelTable.id, workspaceLabel.id),
      });
      expect(labelRow).toBeUndefined();

      const tagRow = await db.query.labelTable.findFirst({
        where: eq(schema.labelTable.id, tag.id),
      });
      expect(tagRow).toBeDefined();

      const tagCopy = await db.query.labelTable.findFirst({
        where: and(
          eq(schema.labelTable.taskId, taskForTag.id),
          eq(schema.labelTable.name, "Bug"),
        ),
      });
      expect(tagCopy).toBeDefined();
      expect(tagCopy?.projectId).not.toBeNull();
    });
  });

  describe("attach and detach scope checks", () => {
    it("attaches a tag to a task in its project without consuming the palette row", async () => {
      const member = await createWorkspaceMember();
      const { project, columns } = await createProjectFixture({
        workspaceId: member.workspace.id,
      });
      const task = await seedTask(project.id, member.user.id, columns.todo.id);

      mockAuthenticatedSession(member.user);
      const { app } = createApp();

      const tagResponse = await createTagViaApi(app, {
        name: "Bug",
        color: "#ef4444",
        projectId: project.id,
      });
      const tag = (await tagResponse.json()) as { id: string };

      const attachResponse = await app.request(`/api/tag/${tag.id}/task`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ taskId: task.id }),
      });
      expect(attachResponse.status).toBe(200);
      const attached = (await attachResponse.json()) as {
        id: string;
        taskId: string | null;
        projectId: string | null;
      };
      expect(attached.id).not.toBe(tag.id);
      expect(attached.taskId).toBe(task.id);
      expect(attached.projectId).toBe(project.id);

      const rows = await db.query.labelTable.findMany({
        where: eq(schema.labelTable.name, "Bug"),
      });
      expect(rows).toHaveLength(2);
      const palette = rows.find((row) => row.taskId === null);
      expect(palette?.id).toBe(tag.id);
    });

    it("detaches a tag copy through the tag route and leaves the palette row", async () => {
      const member = await createWorkspaceMember();
      const { project, columns } = await createProjectFixture({
        workspaceId: member.workspace.id,
      });
      const task = await seedTask(project.id, member.user.id, columns.todo.id);

      mockAuthenticatedSession(member.user);
      const { app } = createApp();

      const tagResponse = await createTagViaApi(app, {
        name: "Bug",
        color: "#ef4444",
        projectId: project.id,
      });
      const tag = (await tagResponse.json()) as { id: string };

      const attachResponse = await app.request(`/api/tag/${tag.id}/task`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ taskId: task.id }),
      });
      const attached = (await attachResponse.json()) as { id: string };

      const detachResponse = await app.request(`/api/tag/${attached.id}/task`, {
        method: "DELETE",
      });
      expect(detachResponse.status).toBe(200);

      const copy = await db.query.labelTable.findFirst({
        where: eq(schema.labelTable.id, attached.id),
      });
      expect(copy).toBeUndefined();
      const palette = await db.query.labelTable.findFirst({
        where: eq(schema.labelTable.id, tag.id),
      });
      expect(palette).toBeDefined();
      expect(palette?.taskId).toBeNull();
    });

    it("rejects attaching a workspace label through tag routes", async () => {
      const member = await createWorkspaceMember();
      const { project, columns } = await createProjectFixture({
        workspaceId: member.workspace.id,
      });
      const task = await seedTask(project.id, member.user.id, columns.todo.id);

      mockAuthenticatedSession(member.user);
      const { app } = createApp();

      const labelResponse = await app.request("/api/label", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Bug",
          color: "#ef4444",
          workspaceId: member.workspace.id,
        }),
      });
      const label = (await labelResponse.json()) as { id: string };

      const response = await app.request(`/api/tag/${label.id}/task`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ taskId: task.id }),
      });
      expect(response.status).toBe(400);
      await expect(response.text()).resolves.toBe("Not a project tag");

      const copies = await db.query.labelTable.findMany({
        where: eq(schema.labelTable.taskId, task.id),
      });
      expect(copies).toHaveLength(0);
    });

    it("rejects detaching a workspace label copy through tag routes", async () => {
      const member = await createWorkspaceMember();
      const { project, columns } = await createProjectFixture({
        workspaceId: member.workspace.id,
      });
      const task = await seedTask(project.id, member.user.id, columns.todo.id);

      const [labelCopy] = await db
        .insert(schema.labelTable)
        .values({
          name: "Bug",
          color: "#ef4444",
          workspaceId: member.workspace.id,
          taskId: task.id,
          projectId: null,
        })
        .returning();

      mockAuthenticatedSession(member.user);
      const { app } = createApp();

      const response = await app.request(`/api/tag/${labelCopy.id}/task`, {
        method: "DELETE",
      });
      expect(response.status).toBe(400);
      await expect(response.text()).resolves.toBe("Not a project tag");

      const persisted = await db.query.labelTable.findFirst({
        where: eq(schema.labelTable.id, labelCopy.id),
      });
      expect(persisted).toBeDefined();
    });

    it("rejects attaching a tag through label routes", async () => {
      const member = await createWorkspaceMember();
      const { project, columns } = await createProjectFixture({
        workspaceId: member.workspace.id,
      });
      const task = await seedTask(project.id, member.user.id, columns.todo.id);

      mockAuthenticatedSession(member.user);
      const { app } = createApp();

      const tagResponse = await createTagViaApi(app, {
        name: "Bug",
        color: "#ef4444",
        projectId: project.id,
      });
      const tag = (await tagResponse.json()) as { id: string };

      const response = await app.request(`/api/label/${tag.id}/task`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ taskId: task.id }),
      });
      expect(response.status).toBe(400);
      await expect(response.text()).resolves.toBe("Not a workspace label");

      const copies = await db.query.labelTable.findMany({
        where: eq(schema.labelTable.taskId, task.id),
      });
      expect(copies).toHaveLength(0);
    });

    it("rejects detaching a tag copy through label routes", async () => {
      const member = await createWorkspaceMember();
      const { project, columns } = await createProjectFixture({
        workspaceId: member.workspace.id,
      });
      const task = await seedTask(project.id, member.user.id, columns.todo.id);

      const [tagCopy] = await db
        .insert(schema.labelTable)
        .values({
          name: "Bug",
          color: "#ef4444",
          workspaceId: member.workspace.id,
          taskId: task.id,
          projectId: project.id,
        })
        .returning();

      mockAuthenticatedSession(member.user);
      const { app } = createApp();

      const response = await app.request(`/api/label/${tagCopy.id}/task`, {
        method: "DELETE",
      });
      expect(response.status).toBe(400);
      await expect(response.text()).resolves.toBe("Not a workspace label");

      const persisted = await db.query.labelTable.findFirst({
        where: eq(schema.labelTable.id, tagCopy.id),
      });
      expect(persisted).toBeDefined();
    });

    it("rejects attaching a tag to a task in another project", async () => {
      const member = await createWorkspaceMember();
      const projectA = await createProjectFixture({
        workspaceId: member.workspace.id,
      });
      const projectB = await createProjectFixture({
        workspaceId: member.workspace.id,
      });
      const taskInB = await seedTask(
        projectB.project.id,
        member.user.id,
        projectB.columns.todo.id,
      );

      mockAuthenticatedSession(member.user);
      const { app } = createApp();

      const tagResponse = await createTagViaApi(app, {
        name: "Bug",
        color: "#ef4444",
        projectId: projectA.project.id,
      });
      const tag = (await tagResponse.json()) as { id: string };

      const response = await app.request(`/api/tag/${tag.id}/task`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ taskId: taskInB.id }),
      });
      expect(response.status).toBe(400);
      await expect(response.text()).resolves.toBe(
        "Tag and task must belong to the same project",
      );

      const copies = await db.query.labelTable.findMany({
        where: eq(schema.labelTable.taskId, taskInB.id),
      });
      expect(copies).toHaveLength(0);
    });
  });

  describe("coexistence of both scopes on one task", () => {
    async function seedTaskWithBothScopes(member: {
      user: { id: string };
      workspace: { id: string };
    }) {
      const { project, columns } = await createProjectFixture({
        workspaceId: member.workspace.id,
      });
      const task = await seedTask(project.id, member.user.id, columns.todo.id);

      mockAuthenticatedSession(member.user);
      const { app } = createApp();

      const labelResponse = await app.request("/api/label", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Bug",
          color: "#ef4444",
          workspaceId: member.workspace.id,
        }),
      });
      expect(labelResponse.status).toBe(200);
      const workspaceLabel = (await labelResponse.json()) as { id: string };

      const attachLabelResponse = await app.request(
        `/api/label/${workspaceLabel.id}/task`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ taskId: task.id }),
        },
      );
      expect(attachLabelResponse.status).toBe(200);
      const labelCopy = (await attachLabelResponse.json()) as {
        id: string;
        projectId: string | null;
      };

      const tagResponse = await createTagViaApi(app, {
        name: "Bug",
        color: "#22c55e",
        projectId: project.id,
      });
      expect(tagResponse.status).toBe(200);
      const tag = (await tagResponse.json()) as { id: string };

      const attachTagResponse = await app.request(`/api/tag/${tag.id}/task`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ taskId: task.id }),
      });
      expect(attachTagResponse.status).toBe(200);
      const tagCopy = (await attachTagResponse.json()) as {
        id: string;
        projectId: string | null;
      };

      return { project, task, workspaceLabel, labelCopy, tag, tagCopy, app };
    }

    it("attaches both a workspace label copy and a same-named tag copy to one task", async () => {
      const member = await createWorkspaceMember();
      const { project, task, labelCopy, tagCopy } =
        await seedTaskWithBothScopes(member);

      // The tag attach created its own scoped copy instead of resolving to
      // the same-named workspace copy.
      expect(tagCopy.id).not.toBe(labelCopy.id);
      expect(labelCopy.projectId).toBeNull();
      expect(tagCopy.projectId).toBe(project.id);

      const rows = await db.query.labelTable.findMany({
        where: eq(schema.labelTable.taskId, task.id),
      });
      expect(rows).toHaveLength(2);
      expect(rows.filter((row) => row.projectId === null)).toHaveLength(1);
      expect(rows.filter((row) => row.projectId === project.id)).toHaveLength(
        1,
      );
    });

    it("returns both scopes from the task labels endpoint", async () => {
      const member = await createWorkspaceMember();
      const { task, labelCopy, tagCopy, app } =
        await seedTaskWithBothScopes(member);

      const response = await app.request(`/api/label/task/${task.id}`);
      expect(response.status).toBe(200);
      const rows = (await response.json()) as Array<{
        id: string;
        name: string;
        projectId: string | null;
      }>;
      expect(rows).toHaveLength(2);
      const ids = rows.map((row) => row.id).sort();
      expect(ids).toEqual([labelCopy.id, tagCopy.id].sort());
      expect(rows.every((row) => row.name === "Bug")).toBe(true);
    });

    it("detaching one scope leaves the other copy intact", async () => {
      const member = await createWorkspaceMember();
      const { task, labelCopy, tagCopy, app } =
        await seedTaskWithBothScopes(member);

      const detachResponse = await app.request(`/api/tag/${tagCopy.id}/task`, {
        method: "DELETE",
      });
      expect(detachResponse.status).toBe(200);

      const remaining = await db.query.labelTable.findMany({
        where: eq(schema.labelTable.taskId, task.id),
      });
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(labelCopy.id);
      expect(remaining[0].projectId).toBeNull();
    });

    it("still prevents duplicates within each scope", async () => {
      const member = await createWorkspaceMember();
      const { project, task, workspaceLabel, labelCopy, tag, tagCopy, app } =
        await seedTaskWithBothScopes(member);

      // Re-attaching through the APIs is idempotent per scope.
      const reattachLabel = await app.request(
        `/api/label/${workspaceLabel.id}/task`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ taskId: task.id }),
        },
      );
      expect(reattachLabel.status).toBe(200);
      const reattachTag = await app.request(`/api/tag/${tag.id}/task`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ taskId: task.id }),
      });
      expect(reattachTag.status).toBe(200);
      const reattachedTag = (await reattachTag.json()) as { id: string };
      expect(reattachedTag.id).toBe(tagCopy.id);

      const rows = await db.query.labelTable.findMany({
        where: eq(schema.labelTable.taskId, task.id),
      });
      expect(rows).toHaveLength(2);

      // The partial unique indexes reject a second copy in the same scope.
      await expect(
        db.insert(schema.labelTable).values({
          name: "Bug",
          color: "#ef4444",
          workspaceId: member.workspace.id,
          taskId: task.id,
          projectId: null,
        }),
      ).rejects.toThrow();
      await expect(
        db.insert(schema.labelTable).values({
          name: "Bug",
          color: "#22c55e",
          workspaceId: member.workspace.id,
          taskId: task.id,
          projectId: project.id,
        }),
      ).rejects.toThrow();

      // And the surviving rows are untouched.
      expect(
        await db.query.labelTable.findFirst({
          where: eq(schema.labelTable.id, labelCopy.id),
        }),
      ).toBeDefined();
    });
  });

  describe("moving tasks between projects", () => {
    it("strips tag copies, keeps workspace labels, and records activity", async () => {
      const member = await createWorkspaceMember();
      const projectA = await createProjectFixture({
        workspaceId: member.workspace.id,
        name: "Project A",
      });
      const projectB = await createProjectFixture({
        workspaceId: member.workspace.id,
        name: "Project B",
      });
      const task = await seedTask(
        projectA.project.id,
        member.user.id,
        projectA.columns.todo.id,
      );

      const [workspaceLabelCopy] = await db
        .insert(schema.labelTable)
        .values({
          name: "Feature",
          color: "#3b82f6",
          workspaceId: member.workspace.id,
          taskId: task.id,
          projectId: null,
        })
        .returning();

      mockAuthenticatedSession(member.user);
      const { app } = createApp();

      const tagResponse = await createTagViaApi(app, {
        name: "Bug",
        color: "#ef4444",
        projectId: projectA.project.id,
      });
      const tag = (await tagResponse.json()) as { id: string };
      const attachResponse = await app.request(`/api/tag/${tag.id}/task`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ taskId: task.id }),
      });
      expect(attachResponse.status).toBe(200);

      const moveResponse = await app.request(`/api/task/move/${task.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ destinationProjectId: projectB.project.id }),
      });
      expect(moveResponse.status).toBe(200);

      const movedTask = await db.query.taskTable.findFirst({
        where: eq(schema.taskTable.id, task.id),
      });
      expect(movedTask?.projectId).toBe(projectB.project.id);

      // The tag copy from project A is stripped; the tag palette row survives.
      const tagCopy = await db.query.labelTable.findFirst({
        where: and(
          eq(schema.labelTable.taskId, task.id),
          eq(schema.labelTable.name, "Bug"),
        ),
      });
      expect(tagCopy).toBeUndefined();
      const tagPalette = await db.query.labelTable.findFirst({
        where: eq(schema.labelTable.id, tag.id),
      });
      expect(tagPalette).toBeDefined();

      // The workspace label copy stays attached.
      const labelCopy = await db.query.labelTable.findFirst({
        where: eq(schema.labelTable.id, workspaceLabelCopy.id),
      });
      expect(labelCopy).toBeDefined();

      // The removal is recorded in the task's activity.
      const activities = await db
        .select()
        .from(schema.activityTable)
        .where(eq(schema.activityTable.taskId, task.id));
      const removal = activities.find(
        (activity) => activity.type === "label_unassigned",
      );
      expect(removal).toBeDefined();
      expect(removal?.userId).toBe(member.user.id);
      const eventData = removal?.eventData as { labelName?: string };
      expect(eventData.labelName).toBe("Bug");
    });
  });

  describe("permissions", () => {
    it("returns 403 for a role without tag:create", async () => {
      const viewer = await createWorkspaceMember({ role: "viewer" });
      const { project } = await createProjectFixture({
        workspaceId: viewer.workspace.id,
      });

      mockAuthenticatedSession(viewer.user);
      const { app } = createApp();

      const response = await createTagViaApi(app, {
        name: "Bug",
        color: "#ef4444",
        projectId: project.id,
      });
      expect(response.status).toBe(403);
      await expect(response.text()).resolves.toBe("Insufficient permissions");

      const persisted = await db.query.labelTable.findFirst({
        where: eq(schema.labelTable.projectId, project.id),
      });
      expect(persisted).toBeUndefined();
    });

    it("returns 403 for a role without tag:update when attaching", async () => {
      const viewer = await createWorkspaceMember({ role: "viewer" });
      const { project, columns } = await createProjectFixture({
        workspaceId: viewer.workspace.id,
      });
      const task = await seedTask(project.id, viewer.user.id, columns.todo.id);

      const [tag] = await db
        .insert(schema.labelTable)
        .values({
          name: "Bug",
          color: "#ef4444",
          workspaceId: viewer.workspace.id,
          taskId: null,
          projectId: project.id,
        })
        .returning();

      mockAuthenticatedSession(viewer.user);
      const { app } = createApp();

      const response = await app.request(`/api/tag/${tag.id}/task`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ taskId: task.id }),
      });
      expect(response.status).toBe(403);
      await expect(response.text()).resolves.toBe("Insufficient permissions");
    });
  });

  describe("scope boundary regressions", () => {
    async function fixture() {
      const member = await createWorkspaceMember();
      const { project, columns } = await createProjectFixture({
        workspaceId: member.workspace.id,
      });
      const task = await seedTask(project.id, member.user.id, columns.todo.id);
      const [label, tag, labelCopy, tagCopy] = await db
        .insert(schema.labelTable)
        .values([
          { name: "Bug", color: "red", workspaceId: member.workspace.id },
          {
            name: "Bug",
            color: "green",
            workspaceId: member.workspace.id,
            projectId: project.id,
          },
          {
            name: "Bug",
            color: "red",
            workspaceId: member.workspace.id,
            taskId: task.id,
          },
          {
            name: "Bug",
            color: "green",
            workspaceId: member.workspace.id,
            projectId: project.id,
            taskId: task.id,
          },
        ])
        .returning();
      await db.insert(schema.workspaceRoleTable).values({
        workspaceId: member.workspace.id,
        role: "member",
        permission: JSON.stringify({
          label: ["read", "create", "update", "delete"],
          tag: [],
        }),
      });
      mockAuthenticatedSession(member.user);
      const { app } = createApp();
      return { member, project, task, label, tag, labelCopy, tagCopy, app };
    }

    it("cannot rename or delete tags using label permissions", async () => {
      const { tag, tagCopy, app } = await fixture();
      for (const row of [tag, tagCopy]) {
        for (const method of ["PUT", "DELETE"]) {
          const response = await app.request(`/api/label/${row.id}`, {
            method,
            headers: { "content-type": "application/json" },
            ...(method === "PUT"
              ? { body: JSON.stringify({ name: "Changed", color: "blue" }) }
              : {}),
          });
          expect(response.status).toBe(400);
          const tagResponse = await app.request(`/api/tag/${row.id}`, {
            method,
            headers: { "content-type": "application/json" },
            ...(method === "PUT"
              ? { body: JSON.stringify({ name: "Changed", color: "blue" }) }
              : {}),
          });
          expect(tagResponse.status).toBe(403);
        }
        expect(
          await db.query.labelTable.findFirst({
            where: eq(schema.labelTable.id, row.id),
          }),
        ).toMatchObject({ name: "Bug" });
      }
    });

    it("bulk label removal preserves a same-named tag", async () => {
      const { app, task, label, tagCopy, labelCopy } = await fixture();
      const response = await app.request("/api/task/bulk", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          taskIds: [task.id],
          operation: "removeLabel",
          value: label.id,
        }),
      });
      expect(response.status).toBe(200);
      expect(
        await db.query.labelTable.findFirst({
          where: eq(schema.labelTable.id, labelCopy.id),
        }),
      ).toBeUndefined();
      expect(
        await db.query.labelTable.findFirst({
          where: eq(schema.labelTable.id, tagCopy.id),
        }),
      ).toBeDefined();
    });

    it("bulk label endpoints reject tag IDs", async () => {
      const { app, task, tag } = await fixture();
      for (const operation of ["addLabel", "removeLabel"]) {
        const response = await app.request("/api/task/bulk", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            taskIds: [task.id],
            operation,
            value: tag.id,
          }),
        });
        expect(response.status).toBe(400);
      }
    });

    it.each(["github", "gitea"])(
      "%s import keeps tags separate from provider labels",
      async (provider) => {
        const { member, task, tagCopy, labelCopy, label } = await fixture();
        await db
          .delete(schema.labelTable)
          .where(eq(schema.labelTable.id, labelCopy.id));
        await db
          .delete(schema.labelTable)
          .where(eq(schema.labelTable.id, label.id));
        if (provider === "github") {
          await importGitHubLabels(
            [{ name: "Bug", color: "abcdef" }],
            task.id,
            member.workspace.id,
          );
        } else {
          await importGiteaLabels(
            [{ name: "Bug", color: "abcdef" }],
            task.id,
            member.workspace.id,
          );
        }
        const rows = await db.query.labelTable.findMany({
          where: eq(schema.labelTable.taskId, task.id),
        });
        expect(rows).toHaveLength(2);
        expect(rows.find((row) => row.id === tagCopy.id)?.color).toBe("green");
        expect(rows.find((row) => row.projectId === null)?.color).toBe(
          "#abcdef",
        );
      },
    );

    it.each([
      { labels: [] },
      { labels: [{ name: "Provider", color: "abcdef" }] },
    ])(
      "Gitea import preserves tags when reconciling provider labels %j",
      async ({ labels }) => {
        const { member, task, tagCopy } = await fixture();
        await importGiteaLabels(labels, task.id, member.workspace.id);
        expect(
          await db.query.labelTable.findFirst({
            where: eq(schema.labelTable.id, tagCopy.id),
          }),
        ).toMatchObject({ name: "Bug", color: "green" });
      },
    );

    it("deleting a project cascades its tags while preserving the workspace palette", async () => {
      const { project, label, tag, tagCopy } = await fixture();
      await db
        .delete(schema.projectTable)
        .where(eq(schema.projectTable.id, project.id));
      expect(
        await db.query.labelTable.findFirst({
          where: eq(schema.labelTable.id, label.id),
        }),
      ).toBeDefined();
      for (const id of [tag.id, tagCopy.id]) {
        expect(
          await db.query.labelTable.findFirst({
            where: eq(schema.labelTable.id, id),
          }),
        ).toBeUndefined();
      }
    });
  });

  describe("workspace_role tag backfill", () => {
    async function seedRoleRow(
      workspaceId: string,
      role: string,
      permission: unknown,
    ) {
      const [row] = await db
        .insert(schema.workspaceRoleTable)
        .values({
          workspaceId,
          role,
          permission:
            typeof permission === "string"
              ? permission
              : JSON.stringify(permission),
        })
        .returning();
      return row;
    }

    it("adds tag statements to default role rows only, preserving edits", async () => {
      const member = await createWorkspaceMember();
      const workspaceId = member.workspace.id;

      const memberRow = await seedRoleRow(workspaceId, "member", {
        project: ["read"],
        task: ["create", "read", "update"],
        label: ["read"],
      });
      const customRow = await seedRoleRow(workspaceId, "contractor", {
        task: ["read"],
      });
      const editedRow = await seedRoleRow(workspaceId, "admin", {
        tag: ["read"],
        task: ["read"],
      });
      const malformedRow = await seedRoleRow(workspaceId, "viewer", "{oops");

      await migrateWorkspaceRoleTagStatements();

      const afterMember = await db.query.workspaceRoleTable.findFirst({
        where: eq(schema.workspaceRoleTable.id, memberRow.id),
      });
      const memberPayload = JSON.parse(afterMember?.permission ?? "{}") as {
        tag: string[];
        label: string[];
      };
      expect(memberPayload.tag).toEqual(["create", "read", "update", "delete"]);
      // Admin edits on other resources are preserved.
      expect(memberPayload.label).toEqual(["read"]);

      const afterCustom = await db.query.workspaceRoleTable.findFirst({
        where: eq(schema.workspaceRoleTable.id, customRow.id),
      });
      expect(afterCustom?.permission).toBe(customRow.permission);
      expect("tag" in JSON.parse(afterCustom?.permission ?? "{}")).toBe(false);

      const afterEdited = await db.query.workspaceRoleTable.findFirst({
        where: eq(schema.workspaceRoleTable.id, editedRow.id),
      });
      expect(afterEdited?.permission).toBe(editedRow.permission);

      const afterMalformed = await db.query.workspaceRoleTable.findFirst({
        where: eq(schema.workspaceRoleTable.id, malformedRow.id),
      });
      expect(afterMalformed?.permission).toBe(malformedRow.permission);
    });

    it("is idempotent", async () => {
      const member = await createWorkspaceMember();
      const workspaceId = member.workspace.id;

      const memberRow = await seedRoleRow(workspaceId, "member", {
        task: ["read"],
      });

      await migrateWorkspaceRoleTagStatements();
      const first = await db.query.workspaceRoleTable.findFirst({
        where: eq(schema.workspaceRoleTable.id, memberRow.id),
      });

      await migrateWorkspaceRoleTagStatements();
      const second = await db.query.workspaceRoleTable.findFirst({
        where: eq(schema.workspaceRoleTable.id, memberRow.id),
      });

      expect(second?.permission).toBe(first?.permission);
      const payload = JSON.parse(second?.permission ?? "{}") as {
        tag: string[];
        task: string[];
      };
      expect(payload.tag).toEqual(["create", "read", "update", "delete"]);
      expect(payload.task).toEqual(["read"]);
    });
  });
});
