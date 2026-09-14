import { ChartCard } from "@/components/charts/chart-card";
import { priorityColor } from "@/components/charts/chart-colors";
import { DonutChart } from "@/components/charts/donut-chart";
import type { ChartDatum } from "@/lib/chart-data";
import { getPriorityLabel } from "@/lib/i18n/domain";

export type PriorityCardLabels = {
  title: string;
  description: string;
  empty: string;
};

type PriorityCardProps = {
  data: ChartDatum[];
  labels: PriorityCardLabels;
};

/**
 * Task counts per priority. Shared by the workspace dashboard and the project
 * overview, so the neutral tones come from one place.
 */
export function PriorityCard({ data, labels }: PriorityCardProps) {
  return (
    <ChartCard title={labels.title} description={labels.description}>
      {data.length === 0 ? (
        <p className="text-muted-foreground text-sm">{labels.empty}</p>
      ) : (
        <DonutChart
          centerValue={String(
            data.reduce((total, entry) => total + entry.value, 0),
          )}
          segments={data.map((entry) => ({
            key: entry.key,
            label: getPriorityLabel(entry.key),
            value: entry.value,
            color: priorityColor(entry.key),
          }))}
        />
      )}
    </ChartCard>
  );
}
