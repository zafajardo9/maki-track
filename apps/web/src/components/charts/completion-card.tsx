import { ChartCard } from "@/components/charts/chart-card";
import { COMPLETED_COLOR, OPEN_COLOR } from "@/components/charts/chart-colors";
import { DonutChart } from "@/components/charts/donut-chart";
import type { CompletionSummary } from "@/lib/chart-data";

export type CompletionCardLabels = {
  title: string;
  description: string;
  completed: string;
  open: string;
  centerCaption: string;
  empty: string;
};

type CompletionCardProps = {
  completion: CompletionSummary;
  labels: CompletionCardLabels;
};

/**
 * Completed-versus-open ring. Shared by the workspace dashboard and the project
 * overview so the same figure is never presented two different ways; only the
 * wording differs, which the caller supplies.
 */
export function CompletionCard({ completion, labels }: CompletionCardProps) {
  const inPlay = completion.completed + completion.open;

  return (
    <ChartCard title={labels.title} description={labels.description}>
      {inPlay === 0 ? (
        <p className="text-muted-foreground text-sm">{labels.empty}</p>
      ) : (
        <DonutChart
          segments={[
            {
              key: "completed",
              label: labels.completed,
              value: completion.completed,
              color: COMPLETED_COLOR,
            },
            {
              key: "open",
              label: labels.open,
              value: completion.open,
              color: OPEN_COLOR,
            },
          ]}
          centerValue={`${completion.percentage}%`}
          centerCaption={labels.centerCaption}
        />
      )}
    </ChartCard>
  );
}
