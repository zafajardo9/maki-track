import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Task from "@/types/task";
import TaskLabelsPopover from "./task-labels-popover";

const mocks = vi.hoisted(() => ({
  taskLabels: [] as Array<{
    id: string;
    name: string;
    color: string;
    projectId: string | null;
    taskId: string | null;
  }>,
  permissions: {
    canCreateLabels: true,
    canCreateTags: true,
    canUpdateLabels: true,
    canUpdateTags: true,
  },
  attachTag: vi.fn(),
  detachTag: vi.fn(),
  attachLabel: vi.fn(),
  detachLabel: vi.fn(),
  createLabel: vi.fn(),
  createTag: vi.fn(),
}));
const tag = {
  id: "tag",
  name: "Bug",
  color: "green",
  projectId: "project",
  taskId: null,
};
const label = {
  id: "label",
  name: "Bug",
  color: "red",
  projectId: null,
  taskId: null,
};
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@/hooks/use-workspace-permission", () => ({
  useWorkspacePermission: () => ({
    canCreateLabels: () => mocks.permissions.canCreateLabels,
    canCreateTags: () => mocks.permissions.canCreateTags,
    canUpdateLabels: () => mocks.permissions.canUpdateLabels,
    canUpdateTags: () => mocks.permissions.canUpdateTags,
  }),
}));
vi.mock("@/hooks/queries/label/use-get-labels-by-task", () => ({
  default: () => ({ data: mocks.taskLabels }),
}));
vi.mock("@/hooks/queries/label/use-get-labels-by-workspace", () => ({
  default: () => ({ data: [label] }),
}));
vi.mock("@/hooks/queries/tag/use-get-tags-by-project", () => ({
  default: () => ({ data: [tag] }),
}));
vi.mock("@/hooks/mutations/tag/use-attach-tag-to-task", () => ({
  default: () => ({ mutateAsync: mocks.attachTag }),
}));
vi.mock("@/hooks/mutations/tag/use-detach-tag-from-task", () => ({
  default: () => ({ mutateAsync: mocks.detachTag }),
}));
vi.mock("@/hooks/mutations/label/use-attach-label-to-task", () => ({
  default: () => ({ mutateAsync: mocks.attachLabel }),
}));
vi.mock("@/hooks/mutations/label/use-detach-label-from-task", () => ({
  default: () => ({ mutateAsync: mocks.detachLabel }),
}));
vi.mock("@/hooks/mutations/label/use-create-label", () => ({
  default: () => ({ mutateAsync: mocks.createLabel }),
}));
vi.mock("@/hooks/mutations/tag/use-create-tag", () => ({
  default: () => ({ mutateAsync: mocks.createTag }),
}));
vi.mock("@/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.taskLabels = [];
  mocks.permissions = {
    canCreateLabels: true,
    canCreateTags: true,
    canUpdateLabels: true,
    canUpdateTags: true,
  };
});

type PickerScope = "tag" | "label" | "both";

function placeholderFor(scope?: PickerScope) {
  if (scope === "tag") return "tasks:popover.tags.searchPlaceholder";
  if (scope === "label") return "tasks:popover.labels.searchPlaceholder";
  return "tasks:popover.searchPlaceholder";
}

async function openPicker(scope?: PickerScope) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TaskLabelsPopover
        task={{ id: "task", projectId: "project" } as Task}
        workspaceId="workspace"
        scope={scope}
      >
        <button type="button">Open</button>
      </TaskLabelsPopover>
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Open" }));
  return screen.findAllByRole("button", { name: "Bug" });
}

describe("TaskLabelsPopover scope independence", () => {
  it("allows attaching a same-named tag while its workspace label is assigned", async () => {
    mocks.taskLabels = [{ ...label, id: "label-copy", taskId: "task" }];
    const [tagButton, labelButton] = await openPicker();
    expect(tagButton).toBeEnabled();
    expect(tagButton).toHaveAttribute("aria-pressed", "false");
    expect(labelButton).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(tagButton);
    await waitFor(() =>
      expect(mocks.attachTag).toHaveBeenCalledWith({
        tagId: "tag",
        taskId: "task",
      }),
    );
    expect(mocks.detachLabel).not.toHaveBeenCalled();
  });
  it("detaches each same-named copy through its own scope", async () => {
    mocks.taskLabels = [
      { ...tag, id: "tag-copy", taskId: "task" },
      { ...label, id: "label-copy", taskId: "task" },
    ];
    const [tagButton, labelButton] = await openPicker();
    expect(tagButton).toBeEnabled();
    expect(labelButton).toBeEnabled();
    fireEvent.click(tagButton);
    await waitFor(() =>
      expect(mocks.detachTag).toHaveBeenCalledWith({ tagId: "tag-copy" }),
    );
    expect(mocks.detachLabel).not.toHaveBeenCalled();
    fireEvent.click(labelButton);
    await waitFor(() =>
      expect(mocks.detachLabel).toHaveBeenCalledWith({ labelId: "label-copy" }),
    );
  });
});

describe("TaskLabelsPopover scope restriction", () => {
  it("offers both pools when unscoped", async () => {
    expect(await openPicker("both")).toHaveLength(2);
  });

  it("lists only tags when scoped to tags", async () => {
    expect(await openPicker("tag")).toHaveLength(1);
  });

  it("lists only labels when scoped to labels", async () => {
    expect(await openPicker("label")).toHaveLength(1);
  });
});

describe("TaskLabelsPopover creating entries", () => {
  async function searchForNewName(name: string, scope?: PickerScope) {
    await openPicker(scope);
    fireEvent.change(screen.getByPlaceholderText(placeholderFor(scope)), {
      target: { value: name },
    });
  }

  it("offers both a tag and a label create action for an unknown name", async () => {
    await searchForNewName("New");
    expect(
      await screen.findByRole("button", { name: "tasks:popover.tags.create" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "tasks:popover.labels.create" }),
    ).toBeInTheDocument();
  });

  it("creates the tag in the task's project and attaches it", async () => {
    mocks.createTag.mockResolvedValue({ id: "new-tag" });
    await searchForNewName("New");
    fireEvent.click(
      await screen.findByRole("button", { name: "tasks:popover.tags.create" }),
    );
    fireEvent.click(
      await screen.findByRole("button", {
        name: "tasks:popover.labels.colors.stone",
      }),
    );

    await waitFor(() =>
      expect(mocks.createTag).toHaveBeenCalledWith({
        name: "New",
        color: "gray",
        projectId: "project",
      }),
    );
    await waitFor(() =>
      expect(mocks.attachTag).toHaveBeenCalledWith({
        tagId: "new-tag",
        taskId: "task",
      }),
    );
    expect(mocks.createLabel).not.toHaveBeenCalled();
  });

  it("hides the tag create action without tag:create permission", async () => {
    mocks.permissions.canCreateTags = false;
    await searchForNewName("New");
    expect(
      await screen.findByRole("button", {
        name: "tasks:popover.labels.create",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "tasks:popover.tags.create" }),
    ).not.toBeInTheDocument();
  });

  it("offers only the tag create action when scoped to tags", async () => {
    await searchForNewName("New", "tag");
    expect(
      await screen.findByRole("button", { name: "tasks:popover.tags.create" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "tasks:popover.labels.create" }),
    ).not.toBeInTheDocument();
  });

  it("offers only the label create action when scoped to labels", async () => {
    await searchForNewName("New", "label");
    expect(
      await screen.findByRole("button", {
        name: "tasks:popover.labels.create",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "tasks:popover.tags.create" }),
    ).not.toBeInTheDocument();
  });
});
