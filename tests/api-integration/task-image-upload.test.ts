import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import db, { schema } from "../../apps/api/src/database";
import { createApp } from "../../apps/api/src/index";
import { mockAnonymousSession, mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import {
  createProjectFixture,
  createWorkspaceMember,
} from "./helpers/fixtures";

describe("API integration: task image upload finalize", () => {
  beforeEach(async () => {
    await resetTestDatabase();

    process.env.IMAGEKIT_PUBLIC_KEY = "public_test";
    process.env.IMAGEKIT_PRIVATE_KEY = "private_test";
    process.env.IMAGEKIT_URL_ENDPOINT = "https://ik.imagekit.io/test-id";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a URL using MAKI_API_URL", async () => {
    process.env.MAKI_API_URL = "http://maki.test:1337";

    const member = await createWorkspaceMember();
    const { project, columns } = await createProjectFixture({
      workspaceId: member.workspace.id,
    });

    const [task] = await db
      .insert(schema.taskTable)
      .values({
        projectId: project.id,
        userId: member.user.id,
        title: "URL test task",
        status: "to-do",
        columnId: columns.todo.id,
        priority: "medium",
        number: 1,
        position: 1,
      })
      .returning();

    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const filePath = `workspace/${member.workspace.id}/project/${project.id}/task/${task.id}/descriptions/test-image.png`;
    const fileId = "file_test_1";

    const response = await app.request(
      `/api/task/image-upload/${task.id}/finalize`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          filePath,
          fileId,
          filename: "test-image.png",
          contentType: "image/png",
          size: 12345,
          surface: "description",
        }),
      },
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { id: string; url: string };
    expect(payload).toHaveProperty("id");
    expect(payload).toHaveProperty("url");
    expect(payload.url).toBe(`http://maki.test:1337/api/asset/${payload.id}`);
    expect(payload.url).not.toContain("localhost");
  });

  it("updates the URL when MAKI_API_URL changes", async () => {
    process.env.MAKI_API_URL = "https://proxy.maki.internal";

    const member = await createWorkspaceMember();
    const { project, columns } = await createProjectFixture({
      workspaceId: member.workspace.id,
    });

    const [task] = await db
      .insert(schema.taskTable)
      .values({
        projectId: project.id,
        userId: member.user.id,
        title: "Proxy test",
        status: "to-do",
        columnId: columns.todo.id,
        priority: "medium",
        number: 1,
        position: 1,
      })
      .returning();

    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const filePath = `workspace/${member.workspace.id}/project/${project.id}/task/${task.id}/descriptions/proxy-image.png`;
    const fileId = "file_test_2";

    const response = await app.request(
      `/api/task/image-upload/${task.id}/finalize`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          filePath,
          fileId,
          filename: "proxy-image.png",
          contentType: "image/png",
          size: 99999,
          surface: "description",
        }),
      },
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { id: string; url: string };
    expect(payload.url).toBe(
      `https://proxy.maki.internal/api/asset/${payload.id}`,
    );
    expect(payload.url).not.toContain("localhost");
  });

  it("falls back to deriving URL from the request when MAKI_API_URL is not set", async () => {
    delete process.env.MAKI_API_URL;

    const member = await createWorkspaceMember();
    const { project, columns } = await createProjectFixture({
      workspaceId: member.workspace.id,
    });

    const [task] = await db
      .insert(schema.taskTable)
      .values({
        projectId: project.id,
        userId: member.user.id,
        title: "Fallback test",
        status: "to-do",
        columnId: columns.todo.id,
        priority: "medium",
        number: 1,
        position: 1,
      })
      .returning();

    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const filePath = `workspace/${member.workspace.id}/project/${project.id}/task/${task.id}/descriptions/fallback-image.png`;
    const fileId = "file_test_3";

    const response = await app.request(
      `https://app.maki.test/api/task/image-upload/${task.id}/finalize`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          filePath,
          fileId,
          filename: "fallback-image.png",
          contentType: "image/png",
          size: 12345,
          surface: "description",
        }),
      },
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { id: string; url: string };
    expect(payload.url).toBe(`https://app.maki.test/api/asset/${payload.id}`);
    expect(payload.url).not.toContain("localhost");
  });

  it("persists a new asset record with correct metadata", async () => {
    process.env.MAKI_API_URL = "http://localhost:1337";

    const member = await createWorkspaceMember();
    const { project, columns } = await createProjectFixture({
      workspaceId: member.workspace.id,
    });

    const [task] = await db
      .insert(schema.taskTable)
      .values({
        projectId: project.id,
        userId: member.user.id,
        title: "Persist test",
        status: "to-do",
        columnId: columns.todo.id,
        priority: "medium",
        number: 1,
        position: 1,
      })
      .returning();

    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const filePath = `workspace/${member.workspace.id}/project/${project.id}/task/${task.id}/descriptions/persist-asset.png`;
    const fileId = "file_test_4";

    const response = await app.request(
      `/api/task/image-upload/${task.id}/finalize`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          filePath,
          fileId,
          filename: "persist-asset.png",
          contentType: "image/png",
          size: 45678,
          surface: "description",
        }),
      },
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { id: string; url: string };

    const asset = await db.query.assetTable.findFirst({
      where: (t, { eq }) => eq(t.id, payload.id),
    });

    expect(asset).toBeDefined();
    expect(asset?.id).toBe(payload.id);
    expect(asset?.objectKey).toBe(filePath);
    expect(asset?.imageKitFileId).toBe(fileId);
    expect(asset?.filename).toBe("persist-asset.png");
    expect(asset?.mimeType).toBe("image/png");
    expect(asset?.size).toBe(45678);
    expect(asset?.kind).toBe("image");
    expect(asset?.surface).toBe("description");
    expect(asset?.workspaceId).toBe(member.workspace.id);
    expect(asset?.projectId).toBe(project.id);
    expect(asset?.taskId).toBe(task.id);
    expect(asset?.createdBy).toBe(member.user.id);
  });

  it("creates attachment records for non-image content types", async () => {
    process.env.MAKI_API_URL = "http://localhost:1337";

    const member = await createWorkspaceMember();
    const { project, columns } = await createProjectFixture({
      workspaceId: member.workspace.id,
    });

    const [task] = await db
      .insert(schema.taskTable)
      .values({
        projectId: project.id,
        userId: member.user.id,
        title: "Attachment test",
        status: "to-do",
        columnId: columns.todo.id,
        priority: "medium",
        number: 1,
        position: 1,
      })
      .returning();

    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const filePath = `workspace/${member.workspace.id}/project/${project.id}/task/${task.id}/descriptions/report.pdf`;
    const fileId = "file_test_5";

    const response = await app.request(
      `/api/task/image-upload/${task.id}/finalize`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          filePath,
          fileId,
          filename: "report.pdf",
          contentType: "application/pdf",
          size: 102400,
          surface: "description",
        }),
      },
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { id: string; url: string };

    const asset = await db.query.assetTable.findFirst({
      where: (t, { eq }) => eq(t.id, payload.id),
    });
    expect(asset?.kind).toBe("attachment");
  });

  it("rejects a file path that does not match the task context", async () => {
    process.env.MAKI_API_URL = "http://localhost:1337";

    const member = await createWorkspaceMember();
    const { project, columns } = await createProjectFixture({
      workspaceId: member.workspace.id,
    });

    const [task] = await db
      .insert(schema.taskTable)
      .values({
        projectId: project.id,
        userId: member.user.id,
        title: "Bad key test",
        status: "to-do",
        columnId: columns.todo.id,
        priority: "medium",
        number: 1,
        position: 1,
      })
      .returning();

    mockAuthenticatedSession(member.user);
    const { app } = createApp();

    const response = await app.request(
      `/api/task/image-upload/${task.id}/finalize`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          filePath: "totally/wrong/path/image.png",
          fileId: "file_test_6",
          filename: "test.png",
          contentType: "image/png",
          size: 100,
          surface: "description",
        }),
      },
    );

    expect(response.status).toBe(400);
    const text = await response.text();
    expect(text).toBe("Image upload path does not match the task context.");
  });

  it("rejects unauthenticated requests", async () => {
    process.env.MAKI_API_URL = "http://localhost:1337";

    const member = await createWorkspaceMember();
    const { project, columns } = await createProjectFixture({
      workspaceId: member.workspace.id,
    });

    const [task] = await db
      .insert(schema.taskTable)
      .values({
        projectId: project.id,
        userId: member.user.id,
        title: "Auth test",
        status: "to-do",
        columnId: columns.todo.id,
        priority: "medium",
        number: 1,
        position: 1,
      })
      .returning();

    mockAnonymousSession();
    const { app } = createApp();

    const response = await app.request(
      `/api/task/image-upload/${task.id}/finalize`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          filePath: "some/path.png",
          fileId: "file_test_7",
          filename: "test.png",
          contentType: "image/png",
          size: 100,
          surface: "description",
        }),
      },
    );

    expect(response.status).toBe(401);
  });

  it("rejects requests from users outside the workspace", async () => {
    process.env.MAKI_API_URL = "http://localhost:1337";

    const member = await createWorkspaceMember();
    const outsiderId = `user-${randomUUID()}`;

    const [outsider] = await db
      .insert(schema.userTable)
      .values({
        id: outsiderId,
        email: `${outsiderId}@example.com`,
        emailVerified: true,
        name: "Outsider",
      })
      .returning();

    const { project, columns } = await createProjectFixture({
      workspaceId: member.workspace.id,
    });

    const [task] = await db
      .insert(schema.taskTable)
      .values({
        projectId: project.id,
        userId: member.user.id,
        title: "RBAC test",
        status: "to-do",
        columnId: columns.todo.id,
        priority: "medium",
        number: 1,
        position: 1,
      })
      .returning();

    mockAuthenticatedSession(outsider);
    const { app } = createApp();

    const response = await app.request(
      `/api/task/image-upload/${task.id}/finalize`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          filePath: `workspace/${member.workspace.id}/project/${project.id}/task/${task.id}/descriptions/rbac-test.png`,
          fileId: "file_test_8",
          filename: "rbac-test.png",
          contentType: "image/png",
          size: 100,
          surface: "description",
        }),
      },
    );

    expect(response.status).toBe(404);
    await expect(response.text()).resolves.toBe("Project not found");
  });
});
