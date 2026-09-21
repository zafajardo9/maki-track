import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import db, { schema } from "../../apps/api/src/database";
import { createApp } from "../../apps/api/src/index";
import { registerMcpTools } from "../../apps/api/src/mcp/tools";
import { getRedisPub } from "../../apps/api/src/redis";
import { canAccessProject } from "../../apps/api/src/utils/project-access";
import {
  addConnection,
  broadcastToProject,
  initializeWebSocketAdapter,
  removeConnection,
  shutdownWebSocketAdapter,
} from "../../apps/api/src/ws";
import { mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";

async function fixture() {
  const owner = await createWorkspaceMember({ role: "owner" });
  const other = await createWorkspaceMember({ role: "member" });
  await db.insert(schema.workspaceUserTable).values({
    workspaceId: owner.workspace.id,
    userId: other.user.id,
    role: "member",
    joinedAt: new Date(),
  });
  const { project, columns } = await createProjectFixture({
    workspaceId: owner.workspace.id,
  });
  await db
    .update(schema.projectTable)
    .set({ accessMode: "restricted" })
    .where(eq(schema.projectTable.id, project.id));
  const [task] = await db
    .insert(schema.taskTable)
    .values({
      title: "Secret project task",
      projectId: project.id,
      status: "to-do",
      columnId: columns.todo.id,
      number: 1,
    })
    .returning();
  mockAuthenticatedSession(owner.user);
  const { app } = createApp();
  const request = (path: string, method = "GET", body?: unknown) =>
    app.request(`/api${path}`, {
      method,
      headers: { "content-type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  return { owner, other, project, task, request };
}

describe("Project access", () => {
  beforeEach(resetTestDatabase);
  afterEach(async () => {
    await shutdownWebSocketAdapter();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("defaults new projects to restricted and grants the creator membership without management privilege", async () => {
    const { other, request } = await fixture();
    mockAuthenticatedSession(other.user);
    const response = await request("/project", "POST", {
      workspaceId: other.workspace.id,
      name: "Private",
      slug: "PRI",
      icon: "Folder",
    });
    expect(response.status).toBe(200);
    const project = await response.json();
    expect(project.accessMode).toBe("restricted");
    expect(await canAccessProject(other.user.id, project.id)).toBe(true);
    expect((await request(`/project/${project.id}/members`)).status).toBe(403);
    expect(
      (
        await request("/project", "POST", {
          workspaceId: other.workspace.id,
          name: "Open",
          slug: "OPEN",
          icon: "Folder",
          accessMode: "workspace",
        })
      ).status,
    ).toBe(403);
  });

  it("hides restricted projects and all task resources from nonmembers", async () => {
    const { owner, other, project, task, request } = await fixture();
    mockAuthenticatedSession(other.user);
    for (const path of [
      `/project/${project.id}`,
      `/task/${task.id}`,
      `/task/tasks/${project.id}`,
      `/task/export/${project.id}`,
      `/tag/project/${project.id}`,
      `/activity/${task.id}`,
    ]) {
      expect((await request(path)).status, path).toBe(404);
    }
    const list = await request(`/project?workspaceId=${owner.workspace.id}`);
    expect(await list.json()).toEqual([]);
    const search = await request(
      `/search?q=Secret&workspaceId=${owner.workspace.id}`,
    );
    expect(search.status).toBe(200);
    expect((await search.json()).results).toEqual([]);
    const tasks = await request(
      `/workspace/${owner.workspace.id}/tasks?scope=all`,
    );
    expect(tasks.status).toBe(200);
    expect(JSON.stringify(await tasks.json())).not.toContain(task.id);
  });

  it("adds/removes members idempotently, preserving action permissions", async () => {
    const { owner, other, project, request } = await fixture();
    await db
      .update(schema.workspaceUserTable)
      .set({ role: "viewer" })
      .where(
        and(
          eq(schema.workspaceUserTable.userId, other.user.id),
          eq(schema.workspaceUserTable.workspaceId, owner.workspace.id),
        ),
      );
    for (let n = 0; n < 2; n++)
      expect(
        (
          await request(
            `/project/${project.id}/members/${other.user.id}`,
            "PUT",
          )
        ).status,
      ).toBe(200);
    mockAuthenticatedSession(other.user);
    expect((await request(`/project/${project.id}`)).status).toBe(200);
    expect((await request(`/project/${project.id}`, "DELETE")).status).toBe(
      403,
    );
    mockAuthenticatedSession(owner.user);
    for (let n = 0; n < 2; n++)
      expect(
        (
          await request(
            `/project/${project.id}/members/${other.user.id}`,
            "DELETE",
          )
        ).status,
      ).toBe(200);
    expect(await canAccessProject(other.user.id, project.id)).toBe(false);
  });

  it("rejects users outside the workspace and cascades membership on workspace departure and project deletion", async () => {
    const { owner, other, project, request } = await fixture();
    const outsider = await createWorkspaceMember();
    expect(
      (
        await request(
          `/project/${project.id}/members/${outsider.user.id}`,
          "PUT",
        )
      ).status,
    ).toBe(400);
    await request(`/project/${project.id}/members/${other.user.id}`, "PUT");
    await db
      .delete(schema.workspaceUserTable)
      .where(
        and(
          eq(schema.workspaceUserTable.userId, other.user.id),
          eq(schema.workspaceUserTable.workspaceId, owner.workspace.id),
        ),
      );
    await db.insert(schema.workspaceUserTable).values({
      workspaceId: owner.workspace.id,
      userId: other.user.id,
      role: "member",
      joinedAt: new Date(),
    });
    expect(await canAccessProject(other.user.id, project.id)).toBe(false);
    await request(`/project/${project.id}/members/${other.user.id}`, "PUT");
    await db
      .delete(schema.projectTable)
      .where(eq(schema.projectTable.id, project.id));
    expect(await db.select().from(schema.projectMemberTable)).toHaveLength(0);
  });

  it("always grants admins visibility and access management despite edited role statements", async () => {
    const { owner, other, project, request } = await fixture();
    await db
      .update(schema.workspaceUserTable)
      .set({ role: "admin" })
      .where(
        and(
          eq(schema.workspaceUserTable.userId, other.user.id),
          eq(schema.workspaceUserTable.workspaceId, owner.workspace.id),
        ),
      );
    await db.insert(schema.workspaceRoleTable).values({
      workspaceId: owner.workspace.id,
      role: "admin",
      permission: "{}",
      createdAt: new Date(),
    });
    mockAuthenticatedSession(other.user);
    expect((await request(`/project/${project.id}`)).status).toBe(200);
    expect(
      (
        await request(`/project/${project.id}/access`, "PUT", {
          accessMode: "workspace",
        })
      ).status,
    ).toBe(200);
    expect((await request(`/project/${project.id}`, "DELETE")).status).toBe(
      403,
    );
  });

  it("requires project access in addition to management permission and revokes custom access-all immediately", async () => {
    const { owner, other, project, request } = await fixture();
    await db
      .update(schema.workspaceUserTable)
      .set({ role: "lead" })
      .where(
        and(
          eq(schema.workspaceUserTable.userId, other.user.id),
          eq(schema.workspaceUserTable.workspaceId, owner.workspace.id),
        ),
      );
    const [role] = await db
      .insert(schema.workspaceRoleTable)
      .values({
        workspaceId: owner.workspace.id,
        role: "lead",
        permission: JSON.stringify({ project: ["manage_access"] }),
        createdAt: new Date(),
      })
      .returning();
    mockAuthenticatedSession(other.user);
    expect((await request(`/project/${project.id}/members`)).status).toBe(404);
    await db
      .update(schema.workspaceRoleTable)
      .set({
        permission: JSON.stringify({
          project: ["access_all", "manage_access"],
        }),
      })
      .where(eq(schema.workspaceRoleTable.id, role.id));
    expect((await request(`/project/${project.id}/members`)).status).toBe(200);
    await db
      .update(schema.workspaceRoleTable)
      .set({ permission: "{}" })
      .where(eq(schema.workspaceRoleTable.id, role.id));
    expect((await request(`/project/${project.id}`)).status).toBe(404);
  });

  it("disables public links atomically and retains selected members when toggling visibility", async () => {
    const { other, project, request } = await fixture();
    await request(`/project/${project.id}/members/${other.user.id}`, "PUT");
    await request(`/project/${project.id}/access`, "PUT", {
      accessMode: "workspace",
    });
    await db
      .update(schema.projectTable)
      .set({ isPublic: true })
      .where(eq(schema.projectTable.id, project.id));
    const restricted = await request(`/project/${project.id}/access`, "PUT", {
      accessMode: "restricted",
    });
    expect((await restricted.json()).isPublic).toBe(false);
    expect(await canAccessProject(other.user.id, project.id)).toBe(true);
    expect(
      (
        await request(`/project/${project.id}`, "PUT", {
          name: project.name,
          slug: project.slug,
          icon: project.icon,
          description: "",
          isPublic: true,
        })
      ).status,
    ).toBe(400);
    expect((await request(`/public-project/${project.id}`)).status).not.toBe(
      200,
    );
    const opened = await request(`/project/${project.id}/access`, "PUT", {
      accessMode: "workspace",
    });
    expect((await opened.json()).isPublic).toBe(false);
  });

  it("does not deliver a queued project event after membership is revoked", async () => {
    const { owner, other, project, request } = await fixture();
    await request(`/project/${project.id}/members/${other.user.id}`, "PUT");
    await initializeWebSocketAdapter();
    const ws = { send: vi.fn(), close: vi.fn() };
    const conn = addConnection(
      project.id,
      ws as never,
      other.user.id,
      "window",
    );
    broadcastToProject(project.id, {
      type: "TASK_UPDATED",
      projectId: project.id,
    });
    await db
      .delete(schema.projectMemberTable)
      .where(eq(schema.projectMemberTable.projectId, project.id));
    await vi.waitFor(() =>
      expect(ws.close).toHaveBeenCalledWith(4003, "Project access revoked"),
    );
    expect(
      ws.send.mock.calls.map(([message]) => JSON.parse(message).type),
    ).not.toContain("TASK_UPDATED");
    removeConnection(project.id, conn);
    expect(await canAccessProject(owner.user.id, project.id)).toBe(true);
  });
  it("enforces API-key identity and scope through MCP as well as HTTP", async () => {
    const { owner, other, project, request } = await fixture();
    const key = "project-access-test-key";
    const [apiKey] = await db
      .insert(schema.apikeyTable)
      .values({
        referenceId: other.user.id,
        userId: other.user.id,
        key: createHash("sha256").update(key).digest("base64url"),
        createdAt: new Date(),
        updatedAt: new Date(),
        permissions: JSON.stringify({ project: ["read"] }),
      })
      .returning();
    const { app } = createApp();
    const callbacks = new Map<
      string,
      (
        args: unknown,
      ) => Promise<{ isError?: boolean; content: { text: string }[] }>
    >();
    registerMcpTools(
      {
        registerTool: (name, _config, callback) =>
          callbacks.set(name, callback),
      },
      "http://maki.test",
      key,
    );
    vi.stubGlobal("fetch", (url: string, init?: RequestInit) =>
      app.request(url, init),
    );
    const hidden = await callbacks.get("get_project")!({ id: project.id });
    expect(hidden.isError).toBe(true);
    expect(hidden.content[0].text).not.toContain(project.name);
    await request(`/project/${project.id}/members/${other.user.id}`, "PUT");
    expect(
      (await callbacks.get("get_project")!({ id: project.id })).isError,
    ).not.toBe(true);
    await db
      .update(schema.apikeyTable)
      .set({ referenceId: owner.user.id, userId: owner.user.id })
      .where(eq(schema.apikeyTable.id, apiKey.id));
    const response = await app.request(`/api/project/${project.id}/access`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ accessMode: "workspace" }),
    });
    expect(response.status).toBe(403);
  });

  it("rejects mixed bulk updates and cross-project moves without changing either project", async () => {
    const { owner, other, project, task, request } = await fixture();
    const visible = await createProjectFixture({
      workspaceId: owner.workspace.id,
    });
    const [publicTask] = await db
      .insert(schema.taskTable)
      .values({
        projectId: visible.project.id,
        columnId: visible.columns.todo.id,
        title: "Visible",
        status: "to-do",
        number: 1,
      })
      .returning();
    mockAuthenticatedSession(other.user);
    expect(
      (
        await request("/task/bulk", "PATCH", {
          taskIds: [publicTask.id, task.id],
          operation: "updatePriority",
          value: "urgent",
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await request(`/task/move/${publicTask.id}`, "PUT", {
          destinationProjectId: project.id,
        })
      ).status,
    ).toBe(404);
    const persisted = await db.query.taskTable.findFirst({
      where: eq(schema.taskTable.id, publicTask.id),
    });
    expect(persisted?.projectId).toBe(visible.project.id);
    expect(persisted?.priority).not.toBe("urgent");
    mockAuthenticatedSession(owner.user);
    expect(
      (
        await request(`/task/assignee/${task.id}`, "PUT", {
          userId: other.user.id,
        })
      ).status,
    ).toBe(403);
    expect(await canAccessProject(other.user.id, project.id)).toBe(false);
  });

  it("filters old notifications and denies private attachments and cross-project relations", async () => {
    const { owner, other, project, task, request } = await fixture();
    const [asset] = await db
      .insert(schema.assetTable)
      .values({
        workspaceId: owner.workspace.id,
        projectId: project.id,
        taskId: task.id,
        objectKey: "access-test-asset",
        filename: "secret.png",
        mimeType: "image/png",
        size: 1,
      })
      .returning();
    await db.insert(schema.notificationTable).values({
      userId: other.user.id,
      type: "task_created",
      resourceType: "task",
      resourceId: task.id,
      title: "Secret",
    });
    const visible = await createProjectFixture({
      workspaceId: owner.workspace.id,
    });
    const [publicTask] = await db
      .insert(schema.taskTable)
      .values({
        projectId: visible.project.id,
        columnId: visible.columns.todo.id,
        title: "Visible",
        status: "to-do",
        number: 1,
      })
      .returning();
    const [relation] = await db
      .insert(schema.taskRelationTable)
      .values({
        sourceTaskId: publicTask.id,
        targetTaskId: task.id,
        relationType: "related",
      })
      .returning();
    mockAuthenticatedSession(other.user);
    expect((await request(`/asset/${asset.id}`)).status).toBe(404);
    const notifications = await request("/notification");
    expect(notifications.status).toBe(200);
    expect(await notifications.json()).toEqual([]);
    expect(
      await (await request(`/task-relation/${publicTask.id}`)).json(),
    ).toEqual([]);
    expect(
      (await request(`/task-relation/${relation.id}`, "DELETE")).status,
    ).toBe(404);
  });

  it.skipIf(!process.env.PROJECT_ACCESS_TEST_REDIS_URL)(
    "rechecks remote Redis deliveries after role revocation",
    async () => {
      const { owner, other, project } = await fixture();
      await db
        .update(schema.workspaceUserTable)
        .set({ role: "admin" })
        .where(
          and(
            eq(schema.workspaceUserTable.userId, other.user.id),
            eq(schema.workspaceUserTable.workspaceId, owner.workspace.id),
          ),
        );
      vi.stubEnv("REDIS_URL", process.env.PROJECT_ACCESS_TEST_REDIS_URL!);
      await initializeWebSocketAdapter();
      const ws = { send: vi.fn(), close: vi.fn() };
      const conn = addConnection(
        project.id,
        ws as never,
        other.user.id,
        "remote-window",
      );
      const publish = () =>
        getRedisPub().publish(
          `maki:ws:${project.id}:broadcast`,
          JSON.stringify({
            projectId: project.id,
            message: { type: "TASK_UPDATED", projectId: project.id },
          }),
        );
      await publish();
      await vi.waitFor(() =>
        expect(ws.send).toHaveBeenCalledWith(
          JSON.stringify({ type: "TASK_UPDATED", projectId: project.id }),
        ),
      );
      ws.send.mockClear();
      await db
        .update(schema.workspaceUserTable)
        .set({ role: "member" })
        .where(
          and(
            eq(schema.workspaceUserTable.userId, other.user.id),
            eq(schema.workspaceUserTable.workspaceId, owner.workspace.id),
          ),
        );
      await publish();
      await vi.waitFor(() =>
        expect(ws.close).toHaveBeenCalledWith(4003, "Project access revoked"),
      );
      expect(
        ws.send.mock.calls.map(([message]) => JSON.parse(message).type),
      ).not.toContain("TASK_UPDATED");
      removeConnection(project.id, conn);
    },
  );
});
