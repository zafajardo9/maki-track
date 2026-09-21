import { describe, expect, it } from "vitest";
import {
  hashTrialEmail,
  normalizeTrialEmail,
} from "../../../apps/api/src/billing/trial-identity";

describe("normalizeTrialEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeTrialEmail("  Andrej@Maki.APP ")).toBe("andrej@maki.app");
  });

  it("drops plus tags so aliases share one trial", () => {
    expect(normalizeTrialEmail("andrej+trial2@maki.app")).toBe(
      "andrej@maki.app",
    );
  });

  it("keeps the address when stripping would empty the local part", () => {
    expect(normalizeTrialEmail("+tag@maki.app")).toBe("+tag@maki.app");
  });

  it("leaves values without an address shape alone", () => {
    expect(normalizeTrialEmail("not-an-email")).toBe("not-an-email");
  });
});

describe("hashTrialEmail", () => {
  it("matches for addresses that normalize to the same mailbox", () => {
    expect(hashTrialEmail("Andrej+one@maki.app")).toBe(
      hashTrialEmail("andrej@maki.app"),
    );
  });

  it("differs for different mailboxes", () => {
    expect(hashTrialEmail("a@maki.app")).not.toBe(hashTrialEmail("b@maki.app"));
  });

  it("does not store the address itself", () => {
    expect(hashTrialEmail("andrej@maki.app")).not.toContain("maki");
  });
});
