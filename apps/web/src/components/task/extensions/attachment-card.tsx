import { mergeAttributes, Node } from "@tiptap/core";
import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { FileText } from "lucide-react";
import { FileNodeDeleteButton } from "./file-node-delete-button";
import { escapeHtml, isValidUrl } from "./url-safety";

function formatBytes(size: number) {
  if (!Number.isFinite(size) || size <= 0) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
  if (size < 1024 * 1024 * 1024)
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function AttachmentCardView({ node, selected, deleteNode }: NodeViewProps) {
  const rawUrl = String(node.attrs.url || "");
  const url = isValidUrl(rawUrl) ? rawUrl : "";
  const filename = String(node.attrs.filename || "Attachment");
  const mimeType = String(node.attrs.mimeType || "");
  const size = Number(node.attrs.size || 0);

  return (
    <NodeViewWrapper
      as="span"
      className="maki-attachment-node"
      data-selected={selected ? "true" : undefined}
    >
      <a
        href={url || undefined}
        target="_blank"
        rel="noopener noreferrer"
        className="maki-attachment-card"
        title={filename}
      >
        <span className="maki-attachment-card-icon">
          <FileText className="size-4" />
        </span>
        <span className="maki-attachment-card-content">
          <span className="maki-attachment-card-title">{filename}</span>
          <span className="maki-attachment-card-meta">
            {formatBytes(size)}
            {mimeType ? ` · ${mimeType}` : ""}
          </span>
        </span>
      </a>
      <FileNodeDeleteButton onDelete={() => deleteNode?.()} />
    </NodeViewWrapper>
  );
}

export const AttachmentCard = Node.create({
  name: "attachmentCard",
  group: "inline",
  inline: true,
  atom: true,
  // Selectable so the node can be focused, removed with Backspace, and marked
  // as selected while its remove control is showing.
  selectable: true,

  addAttributes() {
    return {
      url: { default: "" },
      filename: { default: "" },
      mimeType: { default: "" },
      size: { default: 0 },
    };
  },

  parseHTML() {
    return [
      { tag: "maki-attachment[url]" },
      { tag: "span[data-type='attachment-card'][data-url]" },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "maki-attachment",
      mergeAttributes(HTMLAttributes, {
        "data-type": "attachment-card",
        "data-url": HTMLAttributes.url,
        "data-filename": HTMLAttributes.filename,
        "data-mime-type": HTMLAttributes.mimeType,
        "data-size": HTMLAttributes.size,
        url: HTMLAttributes.url,
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AttachmentCardView);
  },

  renderMarkdown(
    node: {
      attrs?: {
        url?: string;
        filename?: string;
        mimeType?: string;
        size?: number;
      };
    },
    _helpers: unknown,
    _context: unknown,
  ) {
    const url = String(node.attrs?.url || "");
    const filename = String(node.attrs?.filename || "");
    const mimeType = String(node.attrs?.mimeType || "");
    const size = Number(node.attrs?.size || 0);

    if (!url) return "";

    return `\n<maki-attachment url="${escapeHtml(url)}" filename="${escapeHtml(filename)}" mime-type="${escapeHtml(mimeType)}" size="${size}" />\n`;
  },
});
