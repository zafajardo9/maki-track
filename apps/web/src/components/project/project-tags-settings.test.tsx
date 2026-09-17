import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ProjectTagsSettings from "./project-tags-settings";

const mocks = vi.hoisted(() => ({
  canCreateTags: vi.fn(() => true),
  canUpdateTags: vi.fn(() => true),
  canDeleteTags: vi.fn(() => true),
  createTag: vi.fn(),
  updateTag: vi.fn(),
  deleteTag: vi.fn(),
}));

vi.mock("@/hooks/use-project-websocket", () => ({
  useProjectWebSocket: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

vi.mock("@/hooks/use-workspace-permission", () => ({
  useWorkspacePermission: () => ({
    canCreateTags: mocks.canCreateTags,
    canUpdateTags: mocks.canUpdateTags,
    canDeleteTags: mocks.canDeleteTags,
  }),
}));

vi.mock("@/hooks/queries/tag/use-get-tags-by-project", () => ({
  default: () => ({
    data: [
      {
        id: "tag-1",
        name: "Bug",
        color: "red",
        taskId: null,
        workspaceId: "workspace-1",
        projectId: "project-1",
        createdAt: "2026-09-16T00:00:00.000Z",
        updatedAt: "2026-09-16T00:00:00.000Z",
      },
      {
        id: "tag-2",
        name: "Feature",
        color: "green",
        taskId: null,
        workspaceId: "workspace-1",
        projectId: "project-1",
        createdAt: "2026-09-16T00:00:00.000Z",
        updatedAt: "2026-09-16T00:00:00.000Z",
      },
      {
        id: "tag-copy-1",
        name: "Bug",
        color: "red",
        taskId: "task-1",
        workspaceId: "workspace-1",
        projectId: "project-1",
        createdAt: "2026-09-16T00:00:00.000Z",
        updatedAt: "2026-09-16T00:00:00.000Z",
      },
    ],
  }),
}));

vi.mock("@/hooks/mutations/tag/use-create-tag", () => ({
  default: () => ({ mutateAsync: mocks.createTag, isPending: false }),
}));

vi.mock("@/hooks/mutations/tag/use-update-tag", () => ({
  default: () => ({ mutateAsync: mocks.updateTag, isPending: false }),
}));

vi.mock("@/hooks/mutations/tag/use-delete-tag", () => ({
  default: () => ({ mutateAsync: mocks.deleteTag, isPending: false }),
}));

describe("ProjectTagsSettings", () => {
  afterEach(cleanup);

  beforeEach(() => {
    mocks.canCreateTags.mockReset();
    mocks.canCreateTags.mockReturnValue(true);
    mocks.canUpdateTags.mockReset();
    mocks.canUpdateTags.mockReturnValue(true);
    mocks.canDeleteTags.mockReset();
    mocks.canDeleteTags.mockReturnValue(true);
  });

  it("lists palette tags without their task copies", () => {
    render(<ProjectTagsSettings projectId="project-1" />);

    expect(screen.getByText("Bug")).toBeVisible();
    expect(screen.getByText("Feature")).toBeVisible();
    // The copy attached to task-1 shares the name; it must not render as a
    // second palette row.
    expect(screen.getAllByText("Bug")).toHaveLength(1);
  });

  it("shows create, edit and delete affordances with full permissions", () => {
    render(<ProjectTagsSettings projectId="project-1" />);

    expect(
      screen.getByRole("button", { name: "settings:projectTags.createTag" }),
    ).toBeVisible();
    expect(
      screen.getAllByRole("button", {
        name: "settings:projectTags.editTag",
      }),
    ).toHaveLength(2);
    expect(
      screen.getAllByRole("button", {
        name: "settings:projectTags.deleteTag",
      }),
    ).toHaveLength(2);
  });

  it("hides all affordances when tag permissions are denied", () => {
    mocks.canCreateTags.mockReturnValue(false);
    mocks.canUpdateTags.mockReturnValue(false);
    mocks.canDeleteTags.mockReturnValue(false);

    render(<ProjectTagsSettings projectId="project-1" />);

    expect(
      screen.queryByRole("button", { name: "settings:projectTags.createTag" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "settings:projectTags.editTag" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "settings:projectTags.deleteTag" }),
    ).toBeNull();
    // The palette itself stays readable.
    expect(screen.getByText("Bug")).toBeVisible();
  });
});
