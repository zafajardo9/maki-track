import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShareProjectDialog } from "./share-project-dialog";

type Project = { id: string; name: string; isPublic: boolean | null };

const mocks = vi.hoisted(() => ({
  writeText: vi.fn(() => Promise.resolve()),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  updateProject: vi.fn(() => Promise.resolve()),
  hasPermission: vi.fn(() => Promise.resolve(true)),
  project: undefined as
    | { id: string; name: string; isPublic: boolean | null }
    | undefined,
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

vi.mock("@/hooks/queries/project/use-get-project", () => ({
  default: () => ({ data: mocks.project }),
}));

vi.mock("@/hooks/mutations/project/use-update-project", () => ({
  default: () => ({ mutateAsync: mocks.updateProject }),
}));

vi.mock("@/hooks/use-workspace-permission", () => ({
  useWorkspacePermission: () => ({ hasPermission: mocks.hasPermission }),
}));

const COPY_PUBLIC = "shareProject:copyPublicUrlAria";
const COPY_INTERNAL = "shareProject:copyInternalUrlAria";
const OPEN_PUBLIC = "shareProject:openPublicUrlAria";
const OPEN_INTERNAL = "shareProject:openInternalUrlAria";
const PUBLIC_ACCESS_TOGGLE = "settings:projectVisibility.publicAccess";

const PUBLIC_LINK = `${window.location.origin}/public-project/p1`;
const INTERNAL_LINK = `${window.location.origin}/dashboard/workspace/w1/project/p1`;

/**
 * The dialog reads visibility from the project query, falling back to the prop
 * its caller passes, so both have to agree in a test. `project: null` stands
 * for a query that has not resolved.
 */
function renderDialog({
  isPublic,
  project,
}: {
  isPublic: boolean | null | undefined;
  project?: Project | null;
}) {
  mocks.project =
    project === null
      ? undefined
      : (project ?? {
          id: "p1",
          name: "Transmittal",
          isPublic: Boolean(isPublic),
        });

  render(
    <QueryClientProvider client={new QueryClient()}>
      <ShareProjectDialog
        open
        onClose={vi.fn()}
        projectId="p1"
        projectName="Transmittal"
        workspaceId="w1"
        isPublic={isPublic}
      />
    </QueryClientProvider>,
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
    mocks.toastSuccess.mockClear();
    mocks.toastError.mockClear();
    mocks.updateProject.mockClear();
    mocks.hasPermission.mockReset().mockResolvedValue(true);
    mocks.project = undefined;
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: mocks.writeText },
    });
    vi.spyOn(window, "open").mockImplementation(() => null);
  });

  // No automatic cleanup is configured in this repo.
  afterEach(cleanup);

  it("shows the public and internal links side by side", () => {
    renderDialog({ isPublic: true });

    expect(linkValues()).toEqual([PUBLIC_LINK, INTERNAL_LINK]);
  });

  it("copies whichever link its own button belongs to", () => {
    renderDialog({ isPublic: true });

    fireEvent.click(screen.getByRole("button", { name: COPY_PUBLIC }));
    expect(mocks.writeText).toHaveBeenLastCalledWith(PUBLIC_LINK);

    fireEvent.click(screen.getByRole("button", { name: COPY_INTERNAL }));
    expect(mocks.writeText).toHaveBeenLastCalledWith(INTERNAL_LINK);
  });

  it("associates each label with its own input", () => {
    renderDialog({ isPublic: true });

    // `getByLabelText` only resolves through a real label/control association,
    // so this fails if the `htmlFor`/`id` pairing is dropped.
    expect(
      (
        screen.getByLabelText(
          "settings:projectVisibility.publicUrl",
        ) as HTMLInputElement
      ).value,
    ).toBe(PUBLIC_LINK);
    expect(
      (screen.getByLabelText("shareProject:internalUrl") as HTMLInputElement)
        .value,
    ).toBe(INTERNAL_LINK);
  });

  it("warns that the public link is inactive while the project is private", () => {
    renderDialog({ isPublic: false });

    expect(
      screen.getByText("shareProject:publicUrlPrivateHint"),
    ).toBeInTheDocument();
  });

  it("shows the ordinary hint once the project is public", () => {
    renderDialog({ isPublic: true });

    expect(
      screen.getByText("settings:projectVisibility.publicUrlHint"),
    ).toBeInTheDocument();
  });

  it("opens whichever link its own button belongs to, in a new tab", () => {
    renderDialog({ isPublic: true });

    fireEvent.click(screen.getByRole("button", { name: OPEN_PUBLIC }));
    expect(window.open).toHaveBeenLastCalledWith(
      PUBLIC_LINK,
      "_blank",
      "noopener,noreferrer",
    );

    fireEvent.click(screen.getByRole("button", { name: OPEN_INTERNAL }));
    expect(window.open).toHaveBeenLastCalledWith(
      INTERNAL_LINK,
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("leaves the public link unopenable while the project is private", () => {
    renderDialog({ isPublic: false });

    // The hint says the link only resolves once the project is public, so the
    // control must not offer a trip to a page that will not load it.
    expect(screen.getByRole("button", { name: OPEN_PUBLIC })).toBeDisabled();
    expect(screen.getByRole("button", { name: OPEN_INTERNAL })).toBeEnabled();
  });

  it("offers the public toggle to someone who can share", async () => {
    renderDialog({ isPublic: true });

    expect(
      await screen.findByRole("switch", { name: PUBLIC_ACCESS_TOGGLE }),
    ).toBeChecked();
  });

  it("groups the public toggle with the public link it controls", async () => {
    renderDialog({ isPublic: true });

    const toggle = await screen.findByRole("switch", {
      name: PUBLIC_ACCESS_TOGGLE,
    });
    const group = document.querySelector('[data-slot="share-public-group"]');

    expect(group?.contains(toggle)).toBe(true);
    expect(
      group?.contains(
        screen.getByLabelText("settings:projectVisibility.publicUrl"),
      ),
    ).toBe(true);
    expect(
      group?.contains(screen.getByLabelText("shareProject:internalUrl")),
    ).toBe(false);
    // One rule is left — the one fencing off the internal link. The toggle no
    // longer gets a rule of its own above the link it governs.
    expect(screen.getAllByRole("separator")).toHaveLength(1);
  });

  it("withholds the public toggle when the permission check says no", async () => {
    mocks.hasPermission.mockResolvedValue(false);
    renderDialog({ isPublic: true });

    // Give the permission promise a turn before asserting the absence.
    await screen.findByRole("button", { name: OPEN_PUBLIC });
    expect(screen.queryByRole("switch")).toBeNull();
  });

  it("withholds the public toggle when visibility is unknown", async () => {
    renderDialog({ isPublic: null, project: null });

    await screen.findByRole("button", { name: OPEN_PUBLIC });
    expect(screen.queryByRole("switch")).toBeNull();
  });

  it("flips visibility through the update mutation", async () => {
    renderDialog({ isPublic: true });

    fireEvent.click(
      await screen.findByRole("switch", { name: PUBLIC_ACCESS_TOGGLE }),
    );

    expect(mocks.updateProject).toHaveBeenCalledWith(
      expect.objectContaining({ id: "p1", isPublic: false }),
    );
    await waitFor(() =>
      expect(mocks.toastSuccess).toHaveBeenCalledWith(
        "settings:projectVisibility.toastUpdated",
      ),
    );
  });

  it("reports a failed visibility change instead of a success", async () => {
    mocks.updateProject.mockRejectedValueOnce(new Error("nope"));
    renderDialog({ isPublic: false });

    fireEvent.click(
      await screen.findByRole("switch", { name: PUBLIC_ACCESS_TOGGLE }),
    );

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith("nope"));
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
  });
});
