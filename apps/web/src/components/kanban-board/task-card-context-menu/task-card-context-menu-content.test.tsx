import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import type Task from "@/types/task";
import TaskCardContextMenuContent from "./task-card-context-menu-content";

const mocks = vi.hoisted(() => ({
  taskLabels: [] as Array<{
    id: string;
    name: string;
    color: string;
    projectId: string | null;
    taskId: string | null;
  }>,
  tagOption: {
    id: "tag",
    name: "urgent",
    color: "red",
    projectId: "project" as string | null,
    taskId: null as string | null,
  },
  labelOption: {
    id: "label",
    name: "bug",
    color: "green",
    projectId: null as string | null,
    taskId: null as string | null,
  },
  permissions: {
    canUpdateTasks: true,
    canUpdateLabels: true,
    canUpdateTags: true,
    canAssignTasks: true,
    canDeleteTasks: true,
  },
  attachTag: vi.fn(),
  detachTag: vi.fn(),
  attachLabel: vi.fn(),
  detachLabel: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@/hooks/use-workspace-permission", () => ({
  useWorkspacePermission: () => ({
    canUpdateTasks: () => mocks.permissions.canUpdateTasks,
    canUpdateLabels: () => mocks.permissions.canUpdateLabels,
    canUpdateTags: () => mocks.permissions.canUpdateTags,
    canAssignTasks: () => mocks.permissions.canAssignTasks,
    canDeleteTasks: () => mocks.permissions.canDeleteTasks,
  }),
}));
vi.mock("@/hooks/queries/label/use-get-labels-by-task", () => ({
  default: () => ({ data: mocks.taskLabels }),
}));
vi.mock("@/hooks/queries/label/use-get-labels-by-workspace", () => ({
  default: () => ({ data: [mocks.labelOption] }),
}));
vi.mock("@/hooks/queries/tag/use-get-tags-by-project", () => ({
  default: () => ({ data: [mocks.tagOption] }),
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
vi.mock("@/hooks/queries/column/use-get-columns", () => ({
  useGetColumns: () => ({ data: [] }),
}));
vi.mock(
  "@/hooks/queries/workspace-users/use-get-active-workspace-users",
  () => ({
    useGetActiveWorkspaceUsers: () => ({ data: { members: [] } }),
  }),
);
vi.mock("@/hooks/mutations/task/use-update-task", () => ({
  useUpdateTask: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@/hooks/mutations/task/use-update-task-assignee", () => ({
  useUpdateTaskAssignee: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@/hooks/mutations/task/use-update-task-description", () => ({
  useUpdateTaskDescription: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@/hooks/mutations/task/use-update-task-due-date", () => ({
  useUpdateTaskDueDate: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@/hooks/mutations/task/use-update-task-status", () => ({
  useUpdateTaskStatus: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@/hooks/mutations/task/use-update-task-status-priority", () => ({
  useUpdateTaskPriority: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@/hooks/mutations/task/use-update-task-title", () => ({
  useUpdateTaskTitle: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const tagOption = mocks.tagOption;

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.taskLabels = [];
  mocks.permissions = {
    canUpdateTasks: true,
    canUpdateLabels: true,
    canUpdateTags: true,
    canAssignTasks: true,
    canDeleteTasks: true,
  };
});

function renderMenu() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ContextMenu open>
        <ContextMenuTrigger>card</ContextMenuTrigger>
        <TaskCardContextMenuContent
          task={{ id: "task", title: "Task", projectId: "project" } as Task}
          taskCardContext={{ worskpaceId: "workspace", projectId: "project" }}
          onDeleteClick={vi.fn()}
        />
      </ContextMenu>
    </QueryClientProvider>,
  );
}

describe("TaskCardContextMenuContent tags and labels", () => {
  it("shows a Tags and a Labels submenu", () => {
    renderMenu();

    expect(screen.getByText("tasks:contextMenu.tags")).toBeInTheDocument();
    expect(screen.getByText("tasks:contextMenu.labels")).toBeInTheDocument();
  });

  it("hides the tag submenu without tag:update permission or assignments", () => {
    mocks.permissions.canUpdateTags = false;
    renderMenu();

    expect(
      screen.queryByText("tasks:contextMenu.tags"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("tasks:contextMenu.labels")).toBeInTheDocument();
  });

  it("keeps the tag submenu visible read-only when tags are assigned", () => {
    mocks.permissions.canUpdateTags = false;
    mocks.taskLabels = [{ ...tagOption, id: "tag-copy", taskId: "task" }];
    renderMenu();

    expect(screen.getByText("tasks:contextMenu.tags")).toBeInTheDocument();
  });

  it("attaches a tag from the submenu", async () => {
    renderMenu();

    fireEvent.click(screen.getByText("tasks:contextMenu.tags"));

    const item = await screen.findByText("urgent");
    fireEvent.click(item);

    expect(mocks.attachTag).toHaveBeenCalledWith({
      tagId: "tag",
      taskId: "task",
    });
    expect(mocks.attachLabel).not.toHaveBeenCalled();
  });
});
