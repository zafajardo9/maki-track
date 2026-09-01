import CommentEditor from "@/components/activity/comment-editor";

type MarkdownRendererProps = {
  content: string;
};

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <CommentEditor
      value={content}
      readOnly
      showBubbleMenu={false}
      proseClassName="maki-tiptap-prose"
      contentClassName="maki-tiptap-content"
      className="[&_.maki-tiptap-content_.ProseMirror]:max-h-none [&_.maki-tiptap-content_.ProseMirror]:overflow-visible [&_.maki-tiptap-content_.ProseMirror]:px-0 [&_.maki-tiptap-content_.ProseMirror]:py-0"
    />
  );
}
