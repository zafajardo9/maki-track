import { describe, expect, it } from "vitest";
import { getResendSender, isResendConfigured } from "./resend-config";

describe("isResendConfigured", () => {
  it("is true when an API key is set", () => {
    expect(isResendConfigured({ RESEND_API_KEY: "re_test" })).toBe(true);
  });

  it("is false without an API key", () => {
    expect(
      isResendConfigured({ RESEND_FROM: "Maki <no-reply@maki.app>" }),
    ).toBe(false);
    expect(isResendConfigured({})).toBe(false);
  });
});

describe("getResendSender", () => {
  it("returns the configured sender when set", () => {
    expect(getResendSender({ RESEND_FROM: "Maki <hello@maki.app>" })).toBe(
      "Maki <hello@maki.app>",
    );
  });

  it("falls back to the Resend sandbox sender", () => {
    expect(getResendSender({})).toBe("Maki <onboarding@resend.dev>");
  });
});
