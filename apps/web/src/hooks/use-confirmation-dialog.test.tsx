import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useConfirmationDialog } from "./use-confirmation-dialog";

afterEach(cleanup);

vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-i18next")>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));
function Harness({ action }: { action: () => void }) {
  const { confirm, confirmationDialog } = useConfirmationDialog();
  return (
    <>
      <button
        type="button"
        onClick={async () => {
          if (
            await confirm({
              title: "Delete tasks",
              description: "Delete the selected tasks?",
              action: "Delete",
              destructive: true,
            })
          )
            action();
        }}
      >
        Open
      </button>
      {confirmationDialog}
    </>
  );
}

describe("App confirmation dialog", () => {
  it("requires an explicit confirmation and runs only once", async () => {
    const action = vi.fn();
    render(<Harness action={action} />);
    fireEvent.click(screen.getByText("Open"));
    await screen.findByRole("alertdialog");
    expect(action).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
  });
  it("cancels without running the action", async () => {
    const action = vi.fn();
    render(<Harness action={action} />);
    fireEvent.click(screen.getByText("Open"));
    fireEvent.click(await screen.findByText("common:actions.cancel"));
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(action).not.toHaveBeenCalled();
  });
  it("cancels a pending request when its owner unmounts", async () => {
    const action = vi.fn();
    const { unmount } = render(<Harness action={action} />);
    fireEvent.click(screen.getByText("Open"));
    await screen.findByRole("alertdialog");
    unmount();
    await Promise.resolve();
    expect(action).not.toHaveBeenCalled();
  });
});
