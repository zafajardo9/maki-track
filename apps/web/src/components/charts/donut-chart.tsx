import { cn } from "@/lib/cn";

export type DonutSegment = {
  /** Stable identity for the React key. */
  key: string;
  label: string;
  value: number;
  /** Any CSS color, normally a `var(--chart-N)` theme token. */
  color: string;
};

type DonutChartProps = {
  segments: DonutSegment[];
  /** Large figure in the middle of the ring, already formatted. */
  centerValue?: string;
  centerCaption?: string;
  /** `sm` suits surfaces where vertical space is scarce, like the board. */
  size?: "sm" | "md";
  className?: string;
};

// The ring is normalized with `pathLength={100}`, so every dash length is a
// percentage of the circumference regardless of the radius. That avoids
// recomputing 2πr in JavaScript and keeps the arithmetic exact.
const RING_RADIUS = 15.9155;
const RING_VIEWBOX = 42;
const RING_CENTER = RING_VIEWBOX / 2;

/**
 * A ring plus a legend that states every value as text. The SVG is hidden from
 * assistive technology on purpose: the legend already carries the same
 * information in a readable form, and colours are never the only signal.
 */
export function DonutChart({
  segments,
  centerValue,
  centerCaption,
  size = "md",
  className,
}: DonutChartProps) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  let consumed = 0;
  const arcs = segments
    .filter((segment) => segment.value > 0)
    .map((segment) => {
      const share = total > 0 ? (segment.value / total) * 100 : 0;
      const arc = { ...segment, share, offset: consumed };
      consumed += share;
      return arc;
    });

  return (
    <div className={cn("flex items-center gap-5", className)}>
      <div className="relative shrink-0">
        <svg
          viewBox={`0 0 ${RING_VIEWBOX} ${RING_VIEWBOX}`}
          className={size === "sm" ? "size-20" : "size-28"}
          aria-hidden="true"
        >
          <circle
            cx={RING_CENTER}
            cy={RING_CENTER}
            r={RING_RADIUS}
            fill="none"
            strokeWidth="5"
            className="stroke-muted"
          />
          {/* Rotated so the first segment starts at twelve o'clock. */}
          <g transform={`rotate(-90 ${RING_CENTER} ${RING_CENTER})`}>
            {arcs.map((arc) => (
              <circle
                key={arc.key}
                cx={RING_CENTER}
                cy={RING_CENTER}
                r={RING_RADIUS}
                fill="none"
                strokeWidth="5"
                pathLength={100}
                strokeDasharray={`${arc.share} ${100 - arc.share}`}
                strokeDashoffset={-arc.offset}
                style={{ stroke: arc.color }}
              />
            ))}
          </g>
        </svg>
        {centerValue ? (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={cn(
                "font-semibold tabular-nums",
                size === "sm" ? "text-base" : "text-xl",
              )}
            >
              {centerValue}
            </span>
            {centerCaption ? (
              <span className="text-muted-foreground text-xs">
                {centerCaption}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <ul className="min-w-0 flex-1 space-y-2">
        {segments.map((segment) => (
          <li key={segment.key} className="flex items-center gap-2 text-sm">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: segment.color }}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate" title={segment.label}>
              {segment.label}
            </span>
            <span className="font-medium tabular-nums">{segment.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
