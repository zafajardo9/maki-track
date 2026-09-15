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

  const totalTasks = projects.reduce(
    (sum, project) => sum + project.statistics.totalTasks,
    0,
  );
  const overdueTasks = projects.reduce(
    (sum, project) => sum + project.statistics.overdueTasks,
    0,
  );

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-6 rounded-2xl border px-6 py-5 sm:grid-cols-4">
        {[
          {
            label: t("workspace:overview.metrics.projects"),
            value: projects.length,
          },
          { label: t("workspace:overview.metrics.tasks"), value: totalTasks },
          {
            label: t("workspace:overview.metrics.open"),
            value: completion.open,
          },
          {
            label: t("workspace:overview.metrics.overdue"),
            value: overdueTasks,
          },
        ].map(({ label, value }) => (
          <div key={label}>
            <dt className="text-muted-foreground text-sm">{label}</dt>
            <dd className="mt-1 font-semibold text-2xl tabular-nums">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="grid auto-rows-[20rem] gap-6 lg:grid-cols-3 [&>[data-slot=card]>[data-slot=card-panel]]:min-h-0 [&>[data-slot=card]>[data-slot=card-panel]]:overflow-y-auto">
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
    </div>
  );
}
