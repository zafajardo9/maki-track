import Image from "@tiptap/extension-image";
import {
  type NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from "@tiptap/react";
import { FileNodeDeleteButton } from "./file-node-delete-button";

function MakiImageView({ node, selected, deleteNode }: NodeViewProps) {
  const alt = String(node.attrs.alt ?? "");
  const title = node.attrs.title ? String(node.attrs.title) : undefined;

  return (
    <NodeViewWrapper
      className="maki-image-node"
      data-selected={selected ? "true" : undefined}
    >
      {/* The src already points at the authorized /api/asset route. */}
      <img
        src={String(node.attrs.src ?? "")}
        alt={alt}
        title={title}
        className="maki-editor-image"
        draggable={false}
      />
      <FileNodeDeleteButton onDelete={() => deleteNode?.()} />
    </NodeViewWrapper>
  );
}

/**
 * The stock image node with a node view attached, so an image in the canvas
 * carries the same hover/selection remove control an attachment does. Without
 * it an image could be selected and deleted only by knowing to press Backspace.
 */
export const MakiImage = Image.extend({
  addNodeView() {
    return ReactNodeViewRenderer(MakiImageView);
  },
});
