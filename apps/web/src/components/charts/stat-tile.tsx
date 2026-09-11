import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

export type StatTone = "default" | "success" | "warning" | "danger";

const TONE_CLASSES: Record<StatTone, string> = {
  default: "text-foreground",
  success: "text-success-foreground",
  warning: "text-warning-foreground",
  danger: "text-destructive-foreground",
};

type StatTileProps = {
  label: string;
  value: number | string;
  /** Small note under the figure, e.g. the threshold a count uses. */
  hint?: string;
  /** Only meaningful for non-zero figures; the caller decides. */
  tone?: StatTone;
};

/** A single headline number. Rows of these carry the at-a-glance metrics. */
export function StatTile({
  label,
  value,
  hint,
  tone = "default",
}: StatTileProps) {
  return (
    <Card className="gap-1 p-4">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span
        className={cn(
          "font-semibold text-2xl tabular-nums",
          TONE_CLASSES[tone],
        )}
      >
        {value}
      </span>
      {hint ? (
        <span className="text-muted-foreground text-xs">{hint}</span>
      ) : null}
    </Card>
  );
}
