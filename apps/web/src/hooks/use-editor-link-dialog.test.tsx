import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useEditorLinkDialog } from "./use-editor-link-dialog";

afterEach(cleanup);

vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-i18next")>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));

function Harness({ linked = false }: { linked?: boolean }) {
  const editor = useEditor({
    extensions: [StarterKit],
    // jsdom has no layout; selection scrolling is verified in the browser.
    editorProps: { handleScrollToSelection: () => true },
    content: linked
      ? '<p><a href="https://old.example">hello</a> world</p>'
      : "<p>hello world</p>",
  });
  const { openLinkDialog, linkDialog } = useEditorLinkDialog(editor, true);
  return (
    <>
      <EditorContent editor={editor} />
      <button
        type="button"
        disabled={!editor}
        onClick={() => {
          editor?.commands.setTextSelection({ from: 1, to: 6 });
          openLinkDialog();
        }}
      >
        Link
      </button>
      {linkDialog}
    </>
  );
}

describe("Editor link dialog", () => {
  it("keeps the selected text and applies a link through the form", async () => {
    const { container } = render(<Harness />);
    fireEvent.click(screen.getByText("Link"));
    const input = await screen.findByRole("textbox", {
      name: "common:editorLink.url",
    });
    fireEvent.change(input, { target: { value: "https://example.com" } });
    fireEvent.click(screen.getByText("common:editorLink.apply"));
    await waitFor(() =>
      expect(container.querySelector(".tiptap a")?.textContent).toBe("hello"),
    );
    expect(container.querySelector(".tiptap a")?.getAttribute("href")).toBe(
      "https://example.com",
    );
    expect(container.querySelector(".tiptap")?.textContent).toBe("hello world");
  });

  it("prefills an existing link and leaves it unchanged on cancel", async () => {
    const { container } = render(<Harness linked />);
    fireEvent.click(screen.getByText("Link"));
    const input = await screen.findByRole("textbox", {
      name: "common:editorLink.url",
    });
    expect(input).toHaveValue("https://old.example");
    fireEvent.change(input, { target: { value: "https://changed.example" } });
    fireEvent.click(screen.getByText("common:actions.cancel"));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(container.querySelector(".tiptap a")?.getAttribute("href")).toBe(
      "https://old.example",
    );
  });

  it("removes a link when the URL is cleared", async () => {
    const { container } = render(<Harness linked />);
    fireEvent.click(screen.getByText("Link"));
    fireEvent.change(
      await screen.findByRole("textbox", { name: "common:editorLink.url" }),
      { target: { value: "" } },
    );
    fireEvent.click(screen.getByText("common:editorLink.apply"));
    await waitFor(() =>
      expect(container.querySelector(".tiptap a")).toBeNull(),
    );
    expect(container.querySelector(".tiptap")?.textContent).toBe("hello world");
  });
});
