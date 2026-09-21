vi.mock("../../../apps/api/src/utils/project-access", () => ({
  canAccessProject: vi.fn().mockResolvedValue(true),
  assertTaskAccess: vi.fn().mockResolvedValue(undefined),
}));

import type { WSContext } from "hono/ws";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { eventContext, publishEvent } from "../../../apps/api/src/events";
import {
  addConnection,
  initializeWebSocketAdapter,
  removeConnection,
  shutdownWebSocketAdapter,
} from "../../../apps/api/src/ws";

beforeEach(async () => {
  vi.stubEnv("REDIS_URL", "");
  await initializeWebSocketAdapter();
});
afterEach(async () => {
  await shutdownWebSocketAdapter();
  vi.unstubAllEnvs();
});

it("broadcasts palette changes only to other clients in the affected project", async () => {
  const own = { send: vi.fn(), readyState: 1 } as unknown as WSContext;
  const other = { send: vi.fn(), readyState: 1 } as unknown as WSContext;
  const unrelated = { send: vi.fn(), readyState: 1 } as unknown as WSContext;
  const ownConnection = addConnection("project", own, "user", "own-window");
  const otherConnection = addConnection(
    "project",
    other,
    "user",
    "other-window",
  );
  const unrelatedConnection = addConnection(
    "another-project",
    unrelated,
    "user",
    "third-window",
  );
  try {
    await eventContext.run({ initiatorId: "own-window" }, () =>
      publishEvent("project.tags_changed", { projectId: "project" }),
    );
    await vi.waitFor(() =>
      expect(other.send).toHaveBeenCalledWith(
        JSON.stringify({ type: "PROJECT_TAGS_UPDATED", projectId: "project" }),
      ),
    );
    expect(own.send).not.toHaveBeenCalled();
    expect(unrelated.send).not.toHaveBeenCalled();
  } finally {
    removeConnection("project", ownConnection);
    removeConnection("project", otherConnection);
    removeConnection("another-project", unrelatedConnection);
  }
});
