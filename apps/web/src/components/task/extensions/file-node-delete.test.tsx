import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";
import { AttachmentCard } from "./attachment-card";
import { MakiImage } from "./maki-image";

// The remove control is labelled through i18n, so the key comes back verbatim
// and doubles as the accessible name the tests query by.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

const REMOVE_LABEL = "common:actions.remove";

function TestEditor({
  content,
  onReady,
}: {
  content: string;
  onReady: (editor: Editor) => void;
}) {
  const editor = useEditor({
    extensions: [StarterKit, MakiImage, AttachmentCard],
    content,
  });

  useEffect(() => {
    if (editor) onReady(editor);
  }, [editor, onReady]);

  return <EditorContent editor={editor} />;
}

function mount(content: string) {
  let editor: Editor | null = null;
  render(
    <TestEditor
      content={content}
      onReady={(instance) => {
        editor = instance;
      }}
    />,
  );
  return () => {
    if (!editor) throw new Error("editor was never created");
    return editor;
  };
}

describe("file nodes in the editor", () => {
  it("renders a remove control for an image and deletes it", async () => {
    const getEditor = mount(
      '<p><img src="/api/asset/img-1" alt="Screenshot"></p>',
    );

    const remove = await screen.findByRole("button", { name: REMOVE_LABEL });
    fireEvent.click(remove);

    await waitFor(() => {
      expect(getEditor().getHTML()).not.toContain("<img");
    });
  });

  it("renders a remove control for an attachment and deletes it", async () => {
    const getEditor = mount(
      '<p><maki-attachment url="/api/asset/file-1" filename="report.pdf" mime-type="application/pdf" size="2048"></maki-attachment></p>',
    );

    // The card itself is a link to the file; the control is its sibling.
    expect(await screen.findByText("report.pdf")).toBeInTheDocument();

    const remove = await screen.findByRole("button", { name: REMOVE_LABEL });
    fireEvent.click(remove);

    await waitFor(() => {
      expect(getEditor().getHTML()).not.toContain("maki-attachment");
    });
  });

  it("keeps both file nodes selectable", async () => {
    const getEditor = mount('<p><img src="/api/asset/img-2" alt="Shot"></p>');
    await waitFor(() => expect(getEditor()).toBeTruthy());

    const { schema } = getEditor();

    // `selectable: false` is what previously made an attachment impossible to
    // select and therefore impossible to delete.
    expect(NodeSelection.isSelectable(schema.nodes.image.create())).toBe(true);
    expect(
      NodeSelection.isSelectable(
        schema.nodes.attachmentCard.create({ url: "/api/asset/file-2" }),
      ),
    ).toBe(true);
  });
});
