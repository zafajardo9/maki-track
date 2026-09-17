import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CreateTaskModal from "./create-task-modal";

const useLocation = vi.fn();
const createTask = vi.fn(async (input: Record<string, unknown>) => ({
  id: "task-1",
  title: input.title,
  status: input.status,
  projectId: input.projectId,
  createdAt: "2026-08-05T00:00:00.000Z",
}));

const mocks = vi.hoisted(() => ({
  projectTags: [] as Array<{
    id: string;
    name: string;
    color: string;
    taskId: string | null;
    projectId: string | null;
    workspaceId: string | null;
    createdAt: string;
  }>,
  permissions: {
    canCreateTasks: true,
    canCreateLabels: true,
    canUpdateTags: true,
  },
}));

const tagOption = {
  id: "tag-1",
  name: "urgent",
  color: "red",
  taskId: null,
  projectId: "project-1",
  workspaceId: "workspace-1",
  createdAt: "2026-01-01T00:00:00.000Z",
};

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

beforeEach(() => {
  mocks.projectTags = [];
  mocks.permissions = {
    canCreateTasks: true,
    canCreateLabels: true,
    canUpdateTags: true,
  };
});

vi.mock("@tanstack/react-router", () => ({
  useLocation: () => useLocation(),
}));

vi.mock("@/components/task/task-description-editor", () => ({
  default: () => <div data-testid="description-editor" />,
}));

vi.mock("@/hooks/mutations/label/use-create-label", () => ({
  default: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("@/hooks/mutations/task/use-create-task", () => ({
  default: () => ({ mutateAsync: createTask }),
}));

vi.mock("@/hooks/mutations/task/use-delete-task", () => ({
  useDeleteTask: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("@/hooks/mutations/task/use-update-task", () => ({
  useUpdateTask: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("@/hooks/queries/label/use-get-labels-by-workspace", () => ({
  default: () => ({ data: [] }),
}));

vi.mock("@/hooks/queries/tag/use-get-tags-by-project", () => ({
  default: () => ({ data: mocks.projectTags }),
}));

vi.mock("@/hooks/mutations/tag/use-attach-tag-to-task", () => ({
  default: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("@/hooks/queries/workspace/use-active-workspace", () => ({
  default: () => ({ data: { id: "workspace-1", name: "WS" } }),
}));

vi.mock(
  "@/hooks/queries/workspace-users/use-get-active-workspace-users",
  () => ({
    useGetActiveWorkspaceUsers: () => ({ data: { members: [] } }),
  }),
);

vi.mock("@/hooks/use-workspace-permission", () => ({
  useWorkspacePermission: () => ({
    canCreateTasks: () => mocks.permissions.canCreateTasks,
    canCreateLabels: () => mocks.permissions.canCreateLabels,
    canUpdateTags: () => mocks.permissions.canUpdateTags,
  }),
}));

vi.mock("@/hooks/queries/project/use-get-projects", () => ({
  default: () => ({
    data: [
      { id: "project-1", name: "Alpha", slug: "alp" },
      { id: "project-2", name: "Beta", slug: "bet" },
    ],
  }),
}));

vi.mock("@/store/project", () => ({
  default: () => ({ project: null, setProject: vi.fn() }),
}));

vi.mock("@/lib/toast", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

describe("CreateTaskModal project picker", () => {
  it("shows a project picker and creates the task in the chosen project", async () => {
    useLocation.mockReturnValue({
      pathname: "/dashboard/workspace/workspace-1",
    });

    render(<CreateTaskModal open onClose={vi.fn()} />);

    const pickerTrigger = screen.getByText(
      "common:modals.createTask.selectProject",
    );
    fireEvent.click(pickerTrigger);
    fireEvent.click(await screen.findByText("Beta"));

    fireEvent.change(
      screen.getByPlaceholderText(
        "common:modals.createTask.taskTitlePlaceholder",
      ),
      { target: { value: "Picked project task" } },
    );
    fireEvent.submit(document.querySelector("form") as HTMLFormElement);

    await vi.waitFor(() => {
      expect(createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Picked project task",
          projectId: "project-2",
        }),
      );
    });
  });

  it("hides the picker when a project is in scope from the route", () => {
    useLocation.mockReturnValue({
      pathname: "/dashboard/workspace/workspace-1/project/project-1/board",
    });

    render(<CreateTaskModal open onClose={vi.fn()} />);

    expect(
      screen.queryByText("common:modals.createTask.selectProject"),
    ).toBeNull();
  });
});

describe("CreateTaskModal tags picker", () => {
  beforeEach(() => {
    useLocation.mockReturnValue({
      pathname: "/dashboard/workspace/workspace-1/project/project-1/board",
    });
  });

  it("lists project tags in a dedicated tags picker", async () => {
    mocks.projectTags = [tagOption];
    render(<CreateTaskModal open onClose={vi.fn()} />);

    fireEvent.click(screen.getByText("common:modals.createTask.tags"));

    expect(await screen.findByText("urgent")).toBeInTheDocument();
  });

  it("keeps project tags out of the labels picker", async () => {
    mocks.projectTags = [tagOption];
    render(<CreateTaskModal open onClose={vi.fn()} />);

    fireEvent.click(screen.getByText("common:modals.createTask.labels"));

    expect(
      await screen.findByText("common:modals.createTask.noLabelsFound"),
    ).toBeInTheDocument();
    expect(screen.queryByText("urgent")).toBeNull();
  });

  it("adds a chip when a tag is selected", async () => {
    mocks.projectTags = [tagOption];
    render(<CreateTaskModal open onClose={vi.fn()} />);

    fireEvent.click(screen.getByText("common:modals.createTask.tags"));
    const option = await screen.findByText("urgent");
    expect(screen.getAllByText("urgent")).toHaveLength(1);

    fireEvent.click(option);

    // One entry in the picker plus the selected chip above the toolbar.
    expect(screen.getAllByText("urgent")).toHaveLength(2);
  });

  it("hides the tags picker without tag:update permission", () => {
    mocks.permissions.canUpdateTags = false;
    render(<CreateTaskModal open onClose={vi.fn()} />);

    expect(screen.queryByText("common:modals.createTask.tags")).toBeNull();
    expect(
      screen.getByText("common:modals.createTask.labels"),
    ).toBeInTheDocument();
  });
});
