import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TaskDetailsSheet from "./task-details-sheet";

const mocks = vi.hoisted(() => ({
  copyToClipboard: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  task: { title: "Fix the flux capacitor", number: 42 } as
    | { title: string; number: number }
    | undefined,
}));

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }));

// `initReactI18next` is required because importing the sheet pulls in the UI
// kit, which initialises the real i18n instance at module scope.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

vi.mock("@/lib/copy-to-clipboard", () => ({
  copyToClipboard: (text: string) => mocks.copyToClipboard(text),
}));

vi.mock("@/lib/toast", () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));

vi.mock("@/hooks/queries/task/use-get-task", () => ({
  default: () => ({ data: mocks.task }),
}));

vi.mock("@/hooks/queries/project/use-get-project", () => ({
  default: () => ({ data: { slug: "maki" } }),
}));

vi.mock("./task-details-content", () => ({ default: () => null }));
vi.mock("./task-properties-sidebar", () => ({ default: () => null }));

const COPY_BUTTON = "tasks:detail.copyTitle";

function renderSheet() {
  render(
    <TaskDetailsSheet
      taskId="task-1"
      projectId="project-1"
      workspaceId="workspace-1"
      onClose={vi.fn()}
    />,
  );
}

function copyButton() {
  return screen.getByRole("button", { name: COPY_BUTTON });
}

describe("TaskDetailsSheet header", () => {
  beforeEach(() => {
    mocks.copyToClipboard.mockReset().mockResolvedValue(true);
    mocks.toastSuccess.mockClear();
    mocks.toastError.mockClear();
    mocks.task = { title: "Fix the flux capacitor", number: 42 };
  });

  // No automatic cleanup is configured in this repo.
  afterEach(cleanup);

  it("copies the task title", async () => {
    renderSheet();

    fireEvent.click(copyButton());

    await waitFor(() =>
      expect(mocks.copyToClipboard).toHaveBeenCalledWith(
        "Fix the flux capacitor",
      ),
    );
    expect(mocks.toastSuccess).toHaveBeenCalledWith(
      "tasks:detail.copyTitleSuccess",
    );
  });

  it("reports a failed copy rather than claiming success", async () => {
    mocks.copyToClipboard.mockResolvedValue(false);
    renderSheet();

    fireEvent.click(copyButton());

    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith(
        "tasks:detail.copyTitleError",
      ),
    );
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
  });

  it("withholds the copy until the task has loaded", () => {
    mocks.task = undefined;
    renderSheet();

    expect(copyButton()).toBeDisabled();
  });
});
