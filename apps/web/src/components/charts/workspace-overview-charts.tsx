import type { client } from "@maki/libs";
import type { InferResponseType } from "hono/client";
import { useTranslation } from "react-i18next";
import { BarChart } from "@/components/charts/bar-chart";
import { ChartCard } from "@/components/charts/chart-card";
import { DonutChart } from "@/components/charts/donut-chart";
import {
  buildPriorityBreakdown,
  buildProjectCompletionData,
  buildWorkspaceCompletion,
} from "@/lib/chart-data";
import { getPriorityLabel } from "@/lib/i18n/domain";

type WorkspaceProject = InferResponseType<
  (typeof client)["project"]["$get"],
  200
>[number];

type WorkspaceOverviewChartsProps = {
  projects: ReadonlyArray<WorkspaceProject>;
};

// Green for finished work, neutral for what is left. Both are theme tokens, so
// the pair stays legible in light and dark without a second palette.
const COMPLETED_COLOR = "var(--success)";
const OPEN_COLOR = "var(--muted-foreground)";
const PROJECT_BAR_COLOR = "var(--chart-2)";

// An escalation ramp rather than unrelated hues: urgent and high reuse the
// app's destructive and warning tokens, and the lower two step down in
// intensity from there.
const PRIORITY_COLORS: Record<string, string> = {
  urgent: "var(--destructive)",
  high: "var(--warning)",
  medium: "color-mix(in srgb, var(--warning) 55%, transparent)",
  low: "var(--info)",
  "no-priority": "var(--muted-foreground)",
};

export function WorkspaceOverviewCharts({
  projects,
}: WorkspaceOverviewChartsProps) {
  const { t } = useTranslation();

  const completion = buildWorkspaceCompletion(projects);
  const priorityBreakdown = buildPriorityBreakdown(projects);
  const projectCompletion = buildProjectCompletionData(projects);

  const completionSegments = [
    {
      key: "completed",
      label: t("workspace:overview.completion.completed"),
      value: completion.completed,
      color: COMPLETED_COLOR,
    },
    {
      key: "open",
      label: t("workspace:overview.completion.open"),
      value: completion.open,
      color: OPEN_COLOR,
    },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <ChartCard
        title={t("workspace:overview.completion.title")}
        description={t("workspace:overview.completion.description")}
      >
        {completion.completed + completion.open === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t("workspace:overview.completion.empty")}
          </p>
        ) : (
          <DonutChart
            segments={completionSegments}
            centerValue={`${completion.percentage}%`}
            centerCaption={t("workspace:overview.completion.centerCaption")}
          />
        )}
      </ChartCard>

      <ChartCard
        title={t("workspace:overview.priority.title")}
        description={t("workspace:overview.priority.description")}
      >
        {priorityBreakdown.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t("workspace:overview.priority.empty")}
          </p>
        ) : (
          <BarChart
            bars={priorityBreakdown.map((entry) => ({
              key: entry.key,
              label: getPriorityLabel(entry.key),
              value: entry.value,
              color: PRIORITY_COLORS[entry.key] ?? "var(--chart-3)",
            }))}
          />
        )}
      </ChartCard>

      <ChartCard
        title={t("workspace:overview.projects.title")}
        description={t("workspace:overview.projects.description")}
      >
        {projectCompletion.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t("workspace:overview.projects.empty")}
          </p>
        ) : (
          <BarChart
            max={100}
            bars={projectCompletion.map((entry) => ({
              key: entry.id,
              label: entry.name,
              value: entry.percentage,
              color: PROJECT_BAR_COLOR,
              caption: `${entry.percentage}% · ${t(
                "workspace:overview.projects.caption",
                {
                  completed: entry.completedTasks,
                  total: entry.completedTasks + entry.openTasks,
                },
              )}`,
            }))}
          />
        )}
      </ChartCard>
    </div>
  );
}
