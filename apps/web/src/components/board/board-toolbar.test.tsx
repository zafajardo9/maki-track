import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BoardToolbar from "./board-toolbar";

const mocks = vi.hoisted(() => ({
  canCreateTasks: vi.fn(() => true),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/hooks/use-workspace-permission", () => ({
  useWorkspacePermission: () => ({ canCreateTasks: mocks.canCreateTasks }),
}));

function renderToolbar(onCreateTask = vi.fn()) {
  render(
    <BoardToolbar
      filters={{
        status: null,
        priority: null,
        assignee: null,
        dueDate: null,
        labels: null,
      }}
      updateFilter={vi.fn()}
      updateLabelFilter={vi.fn()}
      clearFilters={vi.fn()}
      hasActiveFilters={false}
      workspaceLabels={[]}
      viewMode="board"
      setViewMode={vi.fn()}
      sort={{ field: "position", direction: "asc" }}
      onSortChange={vi.fn()}
      onCreateTask={onCreateTask}
    />,
  );
  return onCreateTask;
}

describe("BoardToolbar create task", () => {
  // No automatic cleanup is configured in this repo.
  afterEach(cleanup);

  beforeEach(() => {
    mocks.canCreateTasks.mockReset();
    mocks.canCreateTasks.mockReturnValue(true);
  });

  it("offers a create-task button that calls back", () => {
    const onCreateTask = renderToolbar();

    fireEvent.click(
      screen.getByRole("button", { name: "tasks:board.createTask" }),
    );

    expect(onCreateTask).toHaveBeenCalledTimes(1);
  });

  it("hides the button without permission to create tasks", () => {
    mocks.canCreateTasks.mockReturnValue(false);
    renderToolbar();

    expect(
      screen.queryByRole("button", { name: "tasks:board.createTask" }),
    ).toBeNull();
  });

  it("renders nothing clickable when no handler is supplied", () => {
    render(
      <BoardToolbar
        filters={{
          status: null,
          priority: null,
          assignee: null,
          dueDate: null,
          labels: null,
        }}
        updateFilter={vi.fn()}
        updateLabelFilter={vi.fn()}
        clearFilters={vi.fn()}
        hasActiveFilters={false}
        workspaceLabels={[]}
        viewMode="board"
        setViewMode={vi.fn()}
        sort={{ field: "position", direction: "asc" }}
        onSortChange={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "tasks:board.createTask" }),
    ).toBeNull();
  });
});
