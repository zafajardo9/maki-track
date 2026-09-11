import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

type FileNodeDeleteButtonProps = {
  onDelete: () => void;
};

/**
 * The remove control for a file node in the editor (an image or an attachment).
 *
 * It lives inside the node view rather than in a bubble menu because clicking an
 * attachment opens the file in a new tab, so a click cannot be relied on to
 * select the node first. It stays hidden until the node is hovered or selected,
 * and is reachable by keyboard through `:focus-visible`.
 */
export function FileNodeDeleteButton({ onDelete }: FileNodeDeleteButtonProps) {
  const { t } = useTranslation();
  const label = t("common:actions.remove");

  return (
    <button
      type="button"
      className="maki-file-node-delete"
      contentEditable={false}
      aria-label={label}
      title={label}
      // Prevent the editor from taking the mousedown as a selection change.
      onMouseDown={(event) => event.preventDefault()}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onDelete();
      }}
    >
      <X className="size-3.5" />
    </button>
  );
}
