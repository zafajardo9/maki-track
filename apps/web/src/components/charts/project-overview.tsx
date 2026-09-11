import { useTranslation } from "react-i18next";
import { BarChart } from "@/components/charts/bar-chart";
import { ChartCard } from "@/components/charts/chart-card";
import { PROJECT_BAR_COLOR } from "@/components/charts/chart-colors";
import { CompletionCard } from "@/components/charts/completion-card";
import { PriorityCard } from "@/components/charts/priority-card";
import { ProjectStatusChart } from "@/components/charts/project-status-chart";
import { StatTile } from "@/components/charts/stat-tile";
import { AssigneeAvatar } from "@/components/common/assignee-avatar";
import {
  type BoardTaskLike,
  buildAssigneeWorkload,
  buildColumnCompletion,
  buildDueDateHealth,
  buildUpcomingDeadlines,
  collectProjectTasks,
  countByPriority,
} from "@/lib/chart-data";
import { cn } from "@/lib/cn";
import { dueDateStatusColors, getDueDateStatus } from "@/lib/due-date-status";
import { formatDateMedium } from "@/lib/format";

type ProjectOverviewProps = {
  columns: ReadonlyArray<{
    slug: string;
    name: string;
    isFinal: boolean;
    tasks: ReadonlyArray<BoardTaskLike>;
  }>;
  plannedTasks: ReadonlyArray<BoardTaskLike>;
  archivedTasks: ReadonlyArray<BoardTaskLike>;
  onOpenTask: (taskId: string) => void;
};

export function ProjectOverview({
  columns,
  plannedTasks,
  archivedTasks,
  onOpenTask,
}: ProjectOverviewProps) {
  const { t } = useTranslation();

  const completion = buildColumnCompletion(columns);
  const priorityData = countByPriority(
    collectProjectTasks(columns, plannedTasks, archivedTasks),
  );
  const workload = buildAssigneeWorkload(columns);
  const health = buildDueDateHealth(columns);
  const deadlines = buildUpcomingDeadlines(columns);

  // Tasks in columns, which is the population completion is measured over.
  const inPlay = completion.completed + completion.open;
  const unassigned =
    workload.find((entry) => entry.key === "unassigned")?.value ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatTile label={t("tasks:overview.stats.total")} value={inPlay} />
        <StatTile
          label={t("tasks:overview.stats.completed")}
          value={completion.completed}
          tone="success"
        />
        <StatTile
          label={t("tasks:overview.stats.open")}
          value={completion.open}
        />
        <StatTile
          label={t("tasks:overview.stats.overdue")}
          value={health.overdue}
          tone={health.overdue > 0 ? "danger" : "default"}
        />
        <StatTile
          label={t("tasks:overview.stats.dueSoon")}
          value={health.dueSoon}
          hint={t("tasks:overview.stats.dueSoonHint")}
          tone={health.dueSoon > 0 ? "warning" : "default"}
        />
        <StatTile
          label={t("tasks:overview.stats.unassigned")}
          value={unassigned}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <CompletionCard
          completion={completion}
          labels={{
            title: t("tasks:overview.completion.title"),
            description: t("tasks:overview.completion.description"),
            completed: t("tasks:overview.completion.completed"),
            open: t("tasks:overview.completion.open"),
            centerCaption: t("tasks:overview.completion.centerCaption"),
            empty: t("tasks:overview.completion.empty"),
          }}
        />

        <ProjectStatusChart
          columns={columns}
          plannedCount={plannedTasks.length}
          archivedCount={archivedTasks.length}
        />

        <PriorityCard
          data={priorityData}
          labels={{
            title: t("tasks:overview.priority.title"),
            description: t("tasks:overview.priority.description"),
            empty: t("tasks:overview.priority.empty"),
          }}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <ChartCard
          title={t("tasks:overview.workload.title")}
          description={t("tasks:overview.workload.description")}
        >
          {workload.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t("tasks:overview.workload.empty")}
            </p>
          ) : (
            <BarChart
              bars={workload.map((entry) => ({
                key: entry.key,
                label: entry.name ?? t("tasks:assignee.unassigned"),
                leading: (
                  <AssigneeAvatar name={entry.name} image={entry.image} />
                ),
                value: entry.value,
                color: PROJECT_BAR_COLOR,
              }))}
            />
          )}
        </ChartCard>

        <ChartCard
          className="lg:col-span-2"
          title={t("tasks:overview.deadlines.title")}
          description={t("tasks:overview.deadlines.description")}
        >
          {deadlines.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t("tasks:overview.deadlines.empty")}
            </p>
          ) : (
            <ul className="-mx-2 space-y-0.5">
              {deadlines.map((deadline) => (
                <li key={deadline.id}>
                  <button
                    type="button"
                    onClick={() => onOpenTask(deadline.id)}
                    className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent"
                  >
                    <span
                      className={cn(
                        "shrink-0 rounded-md px-2 py-0.5 text-xs font-medium",
                        dueDateStatusColors[getDueDateStatus(deadline.dueDate)],
                      )}
                    >
                      {formatDateMedium(deadline.dueDate)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {deadline.number != null ? (
                        <span className="text-muted-foreground">
                          #{deadline.number}{" "}
                        </span>
                      ) : null}
                      {deadline.title}
                    </span>
                    <span className="hidden shrink-0 items-center gap-1.5 text-muted-foreground text-xs sm:flex sm:max-w-40">
                      <AssigneeAvatar
                        name={deadline.assigneeName}
                        image={deadline.assigneeImage}
                      />
                      <span className="truncate">
                        {deadline.assigneeName ??
                          t("tasks:assignee.unassigned")}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
