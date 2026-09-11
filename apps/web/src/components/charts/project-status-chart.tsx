import { useTranslation } from "react-i18next";
import { ChartCard } from "@/components/charts/chart-card";
import { FINAL_COLUMN_COLOR } from "@/components/charts/chart-colors";
import { DonutChart, type DonutSegment } from "@/components/charts/donut-chart";
import { buildStatusBreakdown, chartColor } from "@/lib/chart-data";

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

export function ProjectStatusChart({
  columns,
  plannedCount,
  archivedCount,
}: ProjectStatusChartProps) {
  const { t } = useTranslation();

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
        color: FINAL_COLUMN_COLOR,
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
    >
      {total === 0 ? (
        <p className="text-muted-foreground text-sm">
          {t("tasks:statusChart.empty")}
        </p>
      ) : (
        <>
          <DonutChart
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
    </ChartCard>
  );
}
