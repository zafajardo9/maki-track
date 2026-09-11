import { BarChart } from "@/components/charts/bar-chart";
import { ChartCard } from "@/components/charts/chart-card";
import { priorityColor } from "@/components/charts/chart-colors";
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
 * overview, so the escalation colours come from one place.
 */
export function PriorityCard({ data, labels }: PriorityCardProps) {
  return (
    <ChartCard title={labels.title} description={labels.description}>
      {data.length === 0 ? (
        <p className="text-muted-foreground text-sm">{labels.empty}</p>
      ) : (
        <BarChart
          bars={data.map((entry) => ({
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
