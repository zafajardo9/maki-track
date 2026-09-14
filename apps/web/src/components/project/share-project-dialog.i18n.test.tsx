import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { i18n, preloadNamespaces } from "@/lib/i18n";
import { ShareProjectDialog } from "./share-project-dialog";

vi.mock("@/lib/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

/**
 * The other dialog test mocks `t` as an identity function, which renders the key
 * as its own "translation" and hides a key that does not resolve — this dialog
 * shipped every label as `shareProject.something` because its namespace prefix
 * was missing. These assertions run against the real locale so an unresolvable
 * key fails here.
 */
describe("ShareProjectDialog copy", () => {
  beforeAll(async () => {
    await i18n.changeLanguage("en-US");
    await preloadNamespaces("en-US");
  });

  // No automatic cleanup is configured in this repo.
  afterEach(cleanup);

  it("renders the English copy instead of the raw keys", () => {
    render(
      <ShareProjectDialog
        open
        onClose={vi.fn()}
        projectId="p1"
        projectName="Transmittal"
        workspaceId="w1"
        isPublic
      />,
    );

    expect(screen.getByText("Share project")).toBeInTheDocument();
    expect(screen.getByText("Internal link")).toBeInTheDocument();
    expect(
      screen.getByText("Only members of this workspace can open this"),
    ).toBeInTheDocument();

    // No namespace-prefixed key survived to the DOM.
    expect(screen.queryByText(/^[a-zA-Z]+:[a-zA-Z]/)).toBeNull();
  });
});
