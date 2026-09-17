import { eq } from "drizzle-orm";
import { afterEach, expect, it, vi } from "vitest";
import db, { schema } from "../../apps/api/src/database";
import { runStartupTasks } from "../../apps/api/src/index";
import { shutdownWebSocketAdapter } from "../../apps/api/src/ws";
import { resetTestDatabase } from "./helpers/database";
import { createWorkspaceMember } from "./helpers/fixtures";

// Exercise the real migrations and role seed/backfill without starting timers
// or connecting to external integration providers.
vi.mock("../../apps/api/src/scheduler", () => ({
  initializeScheduler: vi.fn(),
  shutdownScheduler: vi.fn(),
}));
vi.mock("../../apps/api/src/plugins", () => ({ initializePlugins: vi.fn() }));
afterEach(async () => {
  await shutdownWebSocketAdapter();
  vi.unstubAllEnvs();
});

it("boots an existing workspace twice without losing customized role permissions", async () => {
  vi.stubEnv("REDIS_URL", "");
  vi.stubEnv("REDIS_SENTINELS", "");
  vi.stubEnv("REDIS_CLUSTER_NODES", "");
  await resetTestDatabase();
  const member = await createWorkspaceMember();
  await db.insert(schema.workspaceRoleTable).values({
    workspaceId: member.workspace.id,
    role: "member",
    permission: JSON.stringify({ task: ["read"], label: ["read"] }),
  });
  await runStartupTasks();
  await shutdownWebSocketAdapter();
  await runStartupTasks();
  const roles = await db.query.workspaceRoleTable.findMany({
    where: eq(schema.workspaceRoleTable.workspaceId, member.workspace.id),
  });
  expect(roles).toHaveLength(3);
  expect(
    JSON.parse(roles.find((row) => row.role === "member")?.permission ?? "{}"),
  ).toEqual({
    task: ["read"],
    label: ["read"],
    tag: ["create", "read", "update", "delete"],
  });
});
