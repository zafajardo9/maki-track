import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { useProjectWebSocket } from "./use-project-websocket";

vi.mock("@maki/libs", () => ({ windowId: "test-window" }));
vi.mock("@/lib/auth-client", () => ({
  authClient: { useSession: () => ({ data: { user: { id: "user" } } }) },
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("refreshes the tag palette and task copies after a remote rename or delete", () => {
  let socket: FakeSocket;
  class FakeSocket {
    onmessage?: (event: { data: string }) => void;
    close = vi.fn();
    constructor() {
      socket = this;
    }
  }
  vi.stubGlobal("WebSocket", FakeSocket);
  const client = new QueryClient();
  const invalidate = vi.spyOn(client, "invalidateQueries");
  renderHook(() => useProjectWebSocket("project"), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
  act(() =>
    socket.onmessage?.({
      data: JSON.stringify({
        type: "PROJECT_TAGS_UPDATED",
        projectId: "project",
      }),
    }),
  );
  for (const queryKey of [
    ["tags", "project"],
    ["tasks", "project"],
    ["labels"],
    ["task"],
  ]) {
    expect(invalidate).toHaveBeenCalledWith({ queryKey });
  }
});
