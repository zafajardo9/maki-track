import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Task from "@/types/task";
import TaskPropertiesSidebar from "./task-properties-sidebar";

const mocks = vi.hoisted(() => ({
  taskLabels: [] as Array<{
    id: string;
    name: string;
    color: string;
    projectId: string | null;
    taskId: string | null;
  }>,
  permissions: {
    canUpdateLabels: true,
    canUpdateTags: true,
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@/hooks/use-workspace-permission", () => ({
  useWorkspacePermission: () => ({
    canCreateLabels: () => true,
    canCreateTags: () => true,
    canUpdateLabels: () => mocks.permissions.canUpdateLabels,
    canUpdateTags: () => mocks.permissions.canUpdateTags,
  }),
}));
vi.mock("@/hooks/queries/label/use-get-labels-by-task", () => ({
  default: () => ({ data: mocks.taskLabels }),
}));
vi.mock("@/hooks/queries/label/use-get-labels-by-workspace", () => ({
  default: () => ({ data: [] }),
}));
vi.mock("@/hooks/queries/tag/use-get-tags-by-project", () => ({
  default: () => ({ data: [] }),
}));
// The real picker renders inside these tests, so its mutations must resolve.
vi.mock("@/hooks/mutations/label/use-attach-label-to-task", () => ({
  default: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@/hooks/mutations/label/use-detach-label-from-task", () => ({
  default: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@/hooks/mutations/label/use-create-label", () => ({
  default: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@/hooks/mutations/tag/use-attach-tag-to-task", () => ({
  default: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@/hooks/mutations/tag/use-detach-tag-from-task", () => ({
  default: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@/hooks/mutations/tag/use-create-tag", () => ({
  default: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@/hooks/queries/task/use-get-task", () => ({
  default: () => ({
    data: {
      id: "task",
      title: "Task",
      status: "to-do",
      priority: "no-priority",
      projectId: "project",
    } as Task,
  }),
}));
vi.mock("@/hooks/queries/project/use-get-project", () => ({
  default: () => ({ data: { id: "project", name: "Project", slug: "proj" } }),
}));
vi.mock("@/hooks/queries/project/use-get-projects", () => ({
  default: () => ({ data: [] }),
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
vi.mock(
  "@/hooks/queries/github-integration/use-get-github-integration",
  () => ({
    default: () => ({ data: null }),
  }),
);
vi.mock("@/hooks/queries/gitea-integration/use-get-gitea-integration", () => ({
  default: () => ({ data: null }),
}));
vi.mock("@/lib/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() },
}));
// format.ts pulls in the real i18n singleton, which the react-i18next mock
// above cannot satisfy.
vi.mock("@/lib/format", () => ({
  formatDateShort: () => "Jan 1",
}));

// The sibling popovers own their own query graphs; only the labels/tags
// grouping inside this sidebar is under test. TaskLabelsPopover is deliberately
// NOT mocked — the add controls only work when the popover trigger receives a
// real DOM child, which is exactly what these tests must protect.
vi.mock("./task-assignee-popover", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("./task-due-date-popover", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("./task-move-popover", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("./task-priority-popover", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("./task-start-date-popover", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("./task-status-popover", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const tagCopy = {
  id: "tag-copy",
  name: "urgent",
  color: "red",
  projectId: "project",
  taskId: "task",
};
const labelCopy = {
  id: "label-copy",
  name: "bug",
  color: "green",
  projectId: null,
  taskId: "task",
};

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.taskLabels = [];
  mocks.permissions = { canUpdateLabels: true, canUpdateTags: true };
});

function renderSidebar(compact = false) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TaskPropertiesSidebar
        taskId="task"
        projectId="project"
        workspaceId="workspace"
        compact={compact}
      />
    </QueryClientProvider>,
  );
}

describe("TaskPropertiesSidebar tag and label grouping", () => {
  it("renders tags and labels under separate headings", () => {
    mocks.taskLabels = [tagCopy, labelCopy];
    renderSidebar();

    expect(screen.getByText("tasks:properties.tags")).toBeInTheDocument();
    expect(screen.getByText("tasks:properties.labels")).toBeInTheDocument();
    expect(screen.getByText("urgent")).toBeInTheDocument();
    expect(screen.getByText("bug")).toBeInTheDocument();
  });

  it("hides the tag add control without tag:update permission", () => {
    mocks.taskLabels = [tagCopy, labelCopy];
    mocks.permissions.canUpdateTags = false;
    renderSidebar();

    // The assigned tag still renders read-only.
    expect(screen.getByText("urgent")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "tasks:properties.addTag" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "tasks:properties.addLabel" }),
    ).toBeInTheDocument();
  });

  it("keeps label chips visible without label:update permission", () => {
    mocks.taskLabels = [tagCopy, labelCopy];
    mocks.permissions.canUpdateLabels = false;
    renderSidebar();

    expect(screen.getByText("bug")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "tasks:properties.addLabel" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "tasks:properties.addTag" }),
    ).toBeInTheDocument();
  });
});

describe("TaskPropertiesSidebar compact row", () => {
  it("keeps tags and labels on separate rows with their own headings", () => {
    mocks.taskLabels = [tagCopy, labelCopy];
    renderSidebar(true);

    const tagsHeading = screen.getByText("tasks:properties.tags");
    const labelsHeading = screen.getByText("tasks:properties.labels");
    const tagChip = screen.getByText("urgent");
    const labelChip = screen.getByText("bug");

    const tagsRow = tagsHeading.parentElement;
    const labelsRow = labelsHeading.parentElement;

    // Tags come first, and each pool stays in its own row.
    expect(tagsRow).not.toBe(labelsRow);
    expect(tagsRow).toContainElement(tagChip);
    expect(labelsRow).toContainElement(labelChip);
    expect(tagsRow).not.toContainElement(labelChip);
    expect(labelsRow).not.toContainElement(tagChip);
  });

  it("gives each row its own add control", () => {
    mocks.taskLabels = [tagCopy, labelCopy];
    renderSidebar(true);

    expect(
      screen.getByRole("button", { name: "tasks:properties.addTag" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "tasks:properties.addLabel" }),
    ).toBeInTheDocument();
  });

  it("shows both add controls when the task has no tags or labels", () => {
    renderSidebar(true);

    expect(
      screen.getByRole("button", { name: "tasks:properties.addTag" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "tasks:properties.addLabel" }),
    ).toBeInTheDocument();
  });

  it("renders no add control without either update permission", () => {
    mocks.permissions.canUpdateTags = false;
    mocks.permissions.canUpdateLabels = false;
    renderSidebar(true);

    expect(
      screen.queryByRole("button", { name: "tasks:properties.addTag" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "tasks:properties.addLabel" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the tag row read-only without tag:update permission", () => {
    mocks.taskLabels = [tagCopy, labelCopy];
    mocks.permissions.canUpdateTags = false;
    renderSidebar(true);

    expect(screen.getByText("urgent")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "tasks:properties.addTag" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "tasks:properties.addLabel" }),
    ).toBeInTheDocument();
  });
});

describe("TaskPropertiesSidebar add controls", () => {
  // Regression: the add button only opens its picker when it is the popover
  // trigger's direct DOM child. Wrapping it in a context-only component made
  // the trigger render that component instead, so the click went nowhere.
  it("opens the tags picker when tags are already assigned", async () => {
    mocks.taskLabels = [tagCopy];
    renderSidebar(true);

    fireEvent.click(
      screen.getByRole("button", { name: "tasks:properties.addTag" }),
    );

    expect(
      await screen.findByPlaceholderText(
        "tasks:popover.tags.searchPlaceholder",
      ),
    ).toBeInTheDocument();
  });

  it("opens the labels picker when labels are already assigned", async () => {
    mocks.taskLabels = [labelCopy];
    renderSidebar(true);

    fireEvent.click(
      screen.getByRole("button", { name: "tasks:properties.addLabel" }),
    );

    expect(
      await screen.findByPlaceholderText(
        "tasks:popover.labels.searchPlaceholder",
      ),
    ).toBeInTheDocument();
  });
});
