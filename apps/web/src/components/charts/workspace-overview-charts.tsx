import type { client } from "@maki/libs";
import type { InferResponseType } from "hono/client";
import { useTranslation } from "react-i18next";
import { BarChart } from "@/components/charts/bar-chart";
import { ChartCard } from "@/components/charts/chart-card";
import { PROJECT_BAR_COLOR } from "@/components/charts/chart-colors";
import { CompletionCard } from "@/components/charts/completion-card";
import { PriorityCard } from "@/components/charts/priority-card";
import {
  buildPriorityBreakdown,
  buildProjectCompletionData,
  buildWorkspaceCompletion,
} from "@/lib/chart-data";

type WorkspaceProject = InferResponseType<
  (typeof client)["project"]["$get"],
  200
>[number];

type WorkspaceOverviewChartsProps = {
  projects: ReadonlyArray<WorkspaceProject>;
};

export function WorkspaceOverviewCharts({
  projects,
}: WorkspaceOverviewChartsProps) {
  const { t } = useTranslation();

  const completion = buildWorkspaceCompletion(projects);
  const priorityBreakdown = buildPriorityBreakdown(projects);
  const projectCompletion = buildProjectCompletionData(projects);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <CompletionCard
        completion={completion}
        labels={{
          title: t("workspace:overview.completion.title"),
          description: t("workspace:overview.completion.description"),
          completed: t("workspace:overview.completion.completed"),
          open: t("workspace:overview.completion.open"),
          centerCaption: t("workspace:overview.completion.centerCaption"),
          empty: t("workspace:overview.completion.empty"),
        }}
      />

      <PriorityCard
        data={priorityBreakdown}
        labels={{
          title: t("workspace:overview.priority.title"),
          description: t("workspace:overview.priority.description"),
          empty: t("workspace:overview.priority.empty"),
        }}
      />

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
