import { describe, expect, it } from "vitest";
import { createApp } from "../../apps/api/src/index";

describe("API integration: config", () => {
  it("returns the public config shape", async () => {
    const { app } = createApp();

    const response = await app.request("/api/config");

    expect(response.status).toBe(200);
    const payload = (await response.json()) as Record<string, unknown>;

    expect(payload).toEqual({
      disableRegistration: false,
      disableWorkspaceCreation: false,
      isDemoMode: false,
      billingEnabled: false,
    });
  });
});
