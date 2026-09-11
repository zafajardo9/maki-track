import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChartCard } from "@/components/charts/chart-card";
import { DonutChart, type DonutSegment } from "@/components/charts/donut-chart";
import { Button } from "@/components/ui/button";
import { buildStatusBreakdown, chartColor } from "@/lib/chart-data";
import { cn } from "@/lib/cn";

type ProjectStatusChartProps = {
  columns: ReadonlyArray<{
    slug: string;
    name: string;
    isFinal: boolean;
    tasks: ReadonlyArray<unknown>;
  }>;
  plannedCount: number;
  archivedCount: number;
};

// Reuses the same green the workspace completion chart uses for finished work,
// so a column marked final reads consistently across both surfaces.
const FINAL_COLOR = "var(--success)";

export function ProjectStatusChart({
  columns,
  plannedCount,
  archivedCount,
}: ProjectStatusChartProps) {
  const { t } = useTranslation();
  // The board is a fixed-height column that scrolls internally, so the chart
  // takes its space from the board itself. It starts open and can be folded
  // away rather than permanently costing the board ~200px.
  const [isOpen, setIsOpen] = useState(true);

  const breakdown = buildStatusBreakdown(columns);
  const total = breakdown.reduce((sum, entry) => sum + entry.value, 0);

  // Final columns get the completion colour; the rest cycle through the chart
  // palette. Incrementing only for non-final columns keeps the earlier columns
  // from shifting colour when a later one is marked final.
  let paletteIndex = 0;
  const segments: DonutSegment[] = breakdown.map((entry) => {
    if (entry.isFinal) {
      return {
        key: entry.slug,
        label: entry.name,
        value: entry.value,
        color: FINAL_COLOR,
      };
    }

    const color = chartColor(paletteIndex);
    paletteIndex += 1;
    return { key: entry.slug, label: entry.name, value: entry.value, color };
  });

  const parkedTotal = plannedCount + archivedCount;

  return (
    <ChartCard
      title={t("tasks:statusChart.title")}
      description={t("tasks:statusChart.description")}
      className="h-auto"
      action={
        <Button
          variant="ghost"
          size="xs"
          aria-expanded={isOpen}
          aria-controls="project-status-chart"
          onClick={() => setIsOpen((open) => !open)}
        >
          <ChevronDown
            className={cn(
              "size-4 transition-transform",
              !isOpen && "-rotate-90",
            )}
          />
          <span className="sr-only">
            {isOpen ? t("common:actions.collapse") : t("common:actions.expand")}
          </span>
        </Button>
      }
    >
      <div id="project-status-chart" hidden={!isOpen}>
        {total === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t("tasks:statusChart.empty")}
          </p>
        ) : (
          <>
            <DonutChart
              size="sm"
              segments={segments}
              centerValue={String(total)}
              centerCaption={t("tasks:statusChart.centerCaption")}
            />
            {parkedTotal > 0 ? (
              <p className="mt-4 text-muted-foreground text-xs">
                {t("tasks:statusChart.parked", {
                  planned: plannedCount,
                  archived: archivedCount,
                })}
              </p>
            ) : null}
          </>
        )}
      </div>
    </ChartCard>
  );
}
