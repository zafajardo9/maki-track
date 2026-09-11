import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShareProjectDialog } from "./share-project-dialog";

const mocks = vi.hoisted(() => ({
  writeText: vi.fn(() => Promise.resolve()),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

// `initReactI18next` is required because importing the dialog pulls in the UI
// kit, which initialises the real i18n instance at module scope.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

vi.mock("@/lib/toast", () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));

const COPY_PUBLIC = "shareProject.copyPublicUrlAria";
const COPY_INTERNAL = "shareProject.copyInternalUrlAria";

function renderDialog(isPublic: boolean) {
  render(
    <ShareProjectDialog
      open
      onClose={vi.fn()}
      projectId="p1"
      projectName="Transmittal"
      workspaceId="w1"
      isPublic={isPublic}
    />,
  );
}

function linkValues() {
  return screen
    .getAllByRole("textbox")
    .map((input) => (input as HTMLInputElement).value);
}

describe("ShareProjectDialog", () => {
  beforeEach(() => {
    mocks.writeText.mockClear();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: mocks.writeText },
    });
  });

  // No automatic cleanup is configured in this repo.
  afterEach(cleanup);

  it("shows the public and internal links side by side", () => {
    renderDialog(true);

    expect(linkValues()).toEqual([
      `${window.location.origin}/public-project/p1`,
      `${window.location.origin}/dashboard/workspace/w1/project/p1`,
    ]);
  });

  it("copies whichever link its own button belongs to", () => {
    renderDialog(true);

    fireEvent.click(screen.getByRole("button", { name: COPY_PUBLIC }));
    expect(mocks.writeText).toHaveBeenLastCalledWith(
      `${window.location.origin}/public-project/p1`,
    );

    fireEvent.click(screen.getByRole("button", { name: COPY_INTERNAL }));
    expect(mocks.writeText).toHaveBeenLastCalledWith(
      `${window.location.origin}/dashboard/workspace/w1/project/p1`,
    );
  });

  it("associates each label with its own input", () => {
    renderDialog(true);

    // `getByLabelText` only resolves through a real label/control association,
    // so this fails if the `htmlFor`/`id` pairing is dropped.
    expect(
      (
        screen.getByLabelText(
          "settings:projectVisibility.publicUrl",
        ) as HTMLInputElement
      ).value,
    ).toBe(`${window.location.origin}/public-project/p1`);
    expect(
      (screen.getByLabelText("shareProject.internalUrl") as HTMLInputElement)
        .value,
    ).toBe(`${window.location.origin}/dashboard/workspace/w1/project/p1`);
  });

  it("warns that the public link is inactive while the project is private", () => {
    renderDialog(false);

    expect(
      screen.getByText("shareProject.publicUrlPrivateHint"),
    ).toBeInTheDocument();
  });

  it("shows the ordinary hint once the project is public", () => {
    renderDialog(true);

    expect(
      screen.getByText("settings:projectVisibility.publicUrlHint"),
    ).toBeInTheDocument();
  });
});
