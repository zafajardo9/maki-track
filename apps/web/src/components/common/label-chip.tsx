import { Bookmark, Tag } from "lucide-react";
import type { ComponentProps, CSSProperties } from "react";
import { Badge } from "@/components/ui/badge";
import labelColors from "@/constants/label-colors";
import { cn } from "@/lib/cn";

export type LabelChipLabel = {
  name: string;
  color: string;
  projectId?: string | null;
};

function isValidHtmlColor(color: string): boolean {
  const s = new Option().style;
  s.color = color;
  return s.color !== "";
}

/**
 * Resolves a stored label/tag colour to a CSS colour. Stored values are palette
 * keys ("purple"), but rows imported from GitHub/Gitea can carry a raw CSS
 * colour, so both are accepted.
 */
export function labelChipColor(value: string): string {
  const mapped = labelColors.find((c) => c.value === value)?.color;
  if (mapped) {
    return mapped;
  }

  if (isValidHtmlColor(value)) {
    return value;
  }

  return "var(--color-neutral-400)";
}

type LabelChipProps = {
  label: LabelChipLabel;
  /** Tighter chip for dense surfaces such as board cards and the details sheet. */
  compact?: boolean;
  className?: string;
} & Omit<ComponentProps<"span">, "className" | "children" | "style">;

/**
 * The single badge used to render an assigned label or project tag. Scope is
 * carried by the icon — a Tag for project tags, a Bookmark for workspace
 * labels — and the colour tints the chip rather than sitting in a leading dot.
 */
export function LabelChip({
  label,
  compact = false,
  className,
  ...props
}: LabelChipProps) {
  return (
    <Badge
      variant="outline"
      size={compact ? "sm" : "default"}
      title={label.name}
      style={{ "--label-color": labelChipColor(label.color) } as CSSProperties}
      className={cn(
        "flex items-center gap-1 rounded-sm px-2 py-0.5 text-[10px] border-[color-mix(in_oklab,var(--label-color)_28%,transparent)] bg-[color-mix(in_oklab,var(--label-color)_12%,var(--background))] text-[color-mix(in_oklab,var(--label-color)_55%,var(--foreground))] dark:bg-[color-mix(in_oklab,var(--label-color)_20%,var(--background))] dark:text-[color-mix(in_oklab,var(--label-color)_45%,var(--foreground))]",
        compact &&
          "h-4.5 max-w-28 gap-1 px-1.5 py-0 text-[10px] font-normal leading-none sm:h-4.5 sm:text-[10px]",
        className,
      )}
      {...props}
    >
      {label.projectId ? (
        <Tag aria-hidden="true" className={compact ? "size-2.5" : "size-3"} />
      ) : (
        <Bookmark
          aria-hidden="true"
          className={compact ? "size-2.5" : "size-3"}
        />
      )}
      <span className="min-w-0 max-w-20 truncate">{label.name}</span>
    </Badge>
  );
}
