import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BarDatum = {
  /** Stable identity for the React key. */
  key: string;
  label: string;
  value: number;
  /** Any CSS color, normally a theme token. */
  color: string;
  /** Optional trailing note, e.g. "3 of 8 tasks". */
  caption?: string;
  /** Optional node before the label, e.g. the assignee's avatar. */
  leading?: ReactNode;
};

type BarChartProps = {
  bars: BarDatum[];
  /**
   * Value that fills the track. Defaults to the largest value in `bars`, so
   * counts are compared against each other; pass 100 for percentages.
   */
  max?: number;
  className?: string;
};

/**
 * Horizontal bars. The track and fill are plain elements rather than SVG so
 * long labels truncate and the rows reflow on narrow screens for free, which is
 * what the board and the workspace table need.
 */
export function BarChart({ bars, max, className }: BarChartProps) {
  const scale = max ?? Math.max(0, ...bars.map((bar) => bar.value));

  return (
    <ul className={cn("space-y-3", className)}>
      {bars.map((bar) => {
        const fill = scale > 0 ? Math.min(100, (bar.value / scale) * 100) : 0;

        return (
          <li key={bar.key} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                {bar.leading}
                <span className="min-w-0 truncate" title={bar.label}>
                  {bar.label}
                </span>
              </div>
              <span className="shrink-0 text-muted-foreground tabular-nums">
                {bar.caption ?? bar.value}
              </span>
            </div>
            {/* The label and figure above already state the value as text. */}
            <div
              className="bar-chart-track h-2 w-full rounded-full bg-muted"
              aria-hidden="true"
            >
              <div
                className="bar-chart-fill pointer-events-none h-full rounded-full"
                style={{ width: `${fill}%`, backgroundColor: bar.color }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
