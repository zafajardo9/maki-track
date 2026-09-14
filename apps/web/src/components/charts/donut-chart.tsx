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

const RING_RADIUS = 16;
const RING_WIDTH = 6;
const RING_VIEWBOX = 42;
const RING_CENTER = RING_VIEWBOX / 2;

function roundedArc(offset: number, share: number) {
  const sweep = (share / 100) * Math.PI * 2;
  // Reduce padding and corner radii for tiny slices so they stay visible and
  // never overlap their neighbors. Angles still come from the actual values.
  const gap = Math.min(0.045, sweep / 5);
  const start = (offset / 100) * Math.PI * 2 + gap;
  const end = start + sweep - gap * 2;
  const corner = Math.min(0.13, (end - start) / 4);
  const outer = RING_RADIUS + RING_WIDTH / 2;
  const inner = RING_RADIUS - RING_WIDTH / 2;
  const rounding = Math.min(RING_WIDTH / 2, corner * RING_RADIUS);
  const point = (radius: number, angle: number) =>
    `${RING_CENTER + radius * Math.cos(angle)} ${RING_CENTER + radius * Math.sin(angle)}`;
  const large = end - start - corner * 2 > Math.PI ? 1 : 0;

  return [
    `M ${point(outer, start + corner)}`,
    `A ${outer} ${outer} 0 ${large} 1 ${point(outer, end - corner)}`,
    `Q ${point(outer, end)} ${point(outer - rounding, end)}`,
    `L ${point(inner + rounding, end)}`,
    `Q ${point(inner, end)} ${point(inner, end - corner)}`,
    `A ${inner} ${inner} 0 ${large} 0 ${point(inner, start + corner)}`,
    `Q ${point(inner, start)} ${point(inner + rounding, start)}`,
    `L ${point(outer - rounding, start)}`,
    `Q ${point(outer, start)} ${point(outer, start + corner)}`,
    "Z",
  ].join(" ");
}

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
          {arcs.length === 0 ? (
            <circle
              cx={RING_CENTER}
              cy={RING_CENTER}
              r={RING_RADIUS}
              fill="none"
              strokeWidth={RING_WIDTH}
              className="stroke-muted"
            />
          ) : arcs.length === 1 ? (
            <g className="donut-segment">
              <circle
                cx={RING_CENTER}
                cy={RING_CENTER}
                r={RING_RADIUS}
                fill="none"
                stroke="transparent"
                strokeWidth={RING_WIDTH}
                pointerEvents="stroke"
              />
              <circle
                cx={RING_CENTER}
                cy={RING_CENTER}
                r={RING_RADIUS}
                fill="none"
                strokeWidth={RING_WIDTH}
                stroke={arcs[0].color}
                className="donut-segment-fill"
              />
            </g>
          ) : (
            <g transform={`rotate(-135 ${RING_CENTER} ${RING_CENTER})`}>
              {arcs.map((arc) => {
                const path = roundedArc(arc.offset, arc.share);
                return (
                  <g key={arc.key} className="donut-segment">
                    {/* A fixed hit area prevents hover flicker as the fill grows. */}
                    <path d={path} fill="transparent" pointerEvents="fill" />
                    <path
                      d={path}
                      fill={arc.color}
                      className="donut-segment-fill"
                    />
                  </g>
                );
              })}
            </g>
          )}
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
