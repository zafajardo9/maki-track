import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ChartCard } from "@/components/charts/chart-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type getWorkspaceSchedule from "@/fetchers/workspace/get-workspace-schedule";
import useWorkspaceSchedule from "@/hooks/queries/workspace/use-workspace-schedule";
import { formatDateMedium } from "@/lib/format";
import { getStatusDisplayLabel } from "@/lib/i18n/domain";

type Deadline = Awaited<
  ReturnType<typeof getWorkspaceSchedule>
>["overdueTasks"][number];

function DeadlineList({
  tasks,
  workspaceId,
}: {
  tasks: Deadline[];
  workspaceId: string;
}) {
  const { t } = useTranslation();
  return (
    <ul className="divide-y">
      {tasks.map((task) => (
        <li key={task.id}>
          <Link
            to="/dashboard/workspace/$workspaceId/project/$projectId/task/$taskId"
            params={{ workspaceId, projectId: task.projectId, taskId: task.id }}
            className="-mx-2 flex flex-col items-start justify-between gap-2 rounded-md sm:flex-row sm:gap-4 px-2 py-3 hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring"
          >
            <div className="min-w-0">
              <p
                className="line-clamp-2 break-words font-medium text-sm"
                title={task.title}
              >
                {task.title}
              </p>
              <p className="line-clamp-2 text-muted-foreground text-xs">
                {task.projectName} · {task.projectSlug}-{task.number} ·{" "}
                {getStatusDisplayLabel(task.status, task.statusName)}
              </p>
              <p className="mt-1 text-muted-foreground text-xs">
                {t("workspace:overview.schedule.created", {
                  date: formatDateMedium(task.createdAt),
                })}
              </p>
            </div>
            {task.dueDate && (
              <time
                dateTime={task.dueDate}
                className="shrink-0 text-sm tabular-nums"
              >
                {formatDateMedium(task.dueDate)}
              </time>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function WorkspaceSchedule({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const { t } = useTranslation();
  const { data, isPending, isError, refetch } =
    useWorkspaceSchedule(workspaceId);
  if (isPending)
    return (
      <div className="grid gap-6 lg:grid-cols-2" aria-busy="true">
        {[0, 1].map((key) => (
          <Skeleton key={key} className="h-88 rounded-2xl" />
        ))}
      </div>
    );
  if (isError)
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-6"
      >
        <p className="text-sm">{t("workspace:overview.schedule.error")}</p>
        <Button variant="outline" onClick={() => refetch()}>
          {t("workspace:overview.schedule.retry")}
        </Button>
      </div>
    );
  return (
    <section
      className="space-y-4"
      aria-label={t("workspace:overview.schedule.title")}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold text-lg">
          {t("workspace:overview.schedule.title")}
        </h2>
        <p className="text-muted-foreground text-sm">
          {t("workspace:overview.schedule.unscheduled", {
            count: data.noDueDate,
          })}
        </p>
      </div>
      <div className="grid auto-rows-[22rem] gap-6 lg:grid-cols-2 [&>[data-slot=card]>[data-slot=card-panel]]:min-h-0 [&>[data-slot=card]>[data-slot=card-panel]]:overflow-y-auto">
        <ChartCard
          title={t("workspace:overview.schedule.overdue", {
            count: data.overdue,
          })}
          description={t("workspace:overview.schedule.overdueDescription")}
        >
          {data.overdueTasks.length ? (
            <DeadlineList tasks={data.overdueTasks} workspaceId={workspaceId} />
          ) : (
            <p className="text-muted-foreground text-sm">
              {t("workspace:overview.schedule.noOverdue")}
            </p>
          )}
          {data.overdue > data.overdueTasks.length && (
            <p className="py-3 text-muted-foreground text-xs">
              {t("workspace:overview.schedule.showing", {
                count: data.overdueTasks.length,
                total: data.overdue,
              })}
            </p>
          )}
        </ChartCard>
        <ChartCard
          title={t("workspace:overview.schedule.upcoming", {
            count: data.upcoming,
          })}
          description={t("workspace:overview.schedule.upcomingDescription")}
        >
          {data.upcomingTasks.length ? (
            <DeadlineList
              tasks={data.upcomingTasks}
              workspaceId={workspaceId}
            />
          ) : (
            <p className="text-muted-foreground text-sm">
              {t("workspace:overview.schedule.noUpcoming")}
            </p>
          )}
          {data.upcoming > data.upcomingTasks.length && (
            <p className="py-3 text-muted-foreground text-xs">
              {t("workspace:overview.schedule.showing", {
                count: data.upcomingTasks.length,
                total: data.upcoming,
              })}
            </p>
          )}
        </ChartCard>
      </div>
    </section>
  );
}
