import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChartCard } from "@/components/charts/chart-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type getWorkspaceTasks from "@/fetchers/workspace/get-workspace-tasks";
import type { WorkspaceTaskScope } from "@/fetchers/workspace/get-workspace-tasks";
import useWorkspaceTasks from "@/hooks/queries/workspace/use-workspace-tasks";
import { cn } from "@/lib/cn";
import { dueDateStatusColors, getDueDateStatus } from "@/lib/due-date-status";
import { formatDateMedium } from "@/lib/format";
import { getStatusDisplayLabel } from "@/lib/i18n/domain";
import { getPriorityIcon } from "@/lib/priority";

type WorkspaceTask = Awaited<
  ReturnType<typeof getWorkspaceTasks>
>["tasks"][number];

/** Enough to fill the card without turning the workspace home into a board. */
const TASK_LIMIT = 8;

function TaskQueue({
  tasks,
  workspaceId,
}: {
  tasks: WorkspaceTask[];
  workspaceId: string;
}) {
  return (
    <ul className="divide-y">
      {tasks.map((task) => (
        <li key={task.id}>
          <Link
            to="/dashboard/workspace/$workspaceId/project/$projectId/task/$taskId"
            params={{ workspaceId, projectId: task.projectId, taskId: task.id }}
            className="-mx-2 flex flex-col items-start gap-2 rounded-md px-2 py-3 hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring sm:flex-row sm:items-start sm:justify-between sm:gap-4"
          >
            <div className="flex min-w-0 items-start gap-2">
              <span className="mt-0.5 shrink-0">
                {getPriorityIcon(task.priority)}
              </span>
              <div className="min-w-0">
                <p
                  className="line-clamp-2 break-words font-medium text-sm"
                  title={task.title}
                >
                  {task.title}
                </p>
                <p className="line-clamp-2 text-muted-foreground text-xs">
                  {task.projectName} ·{" "}
                  {task.number === null
                    ? task.projectSlug
                    : `${task.projectSlug}-${task.number}`}{" "}
                  · {getStatusDisplayLabel(task.status, task.statusName)}
                </p>
              </div>
            </div>
            {task.dueDate && (
              <span
                className={cn(
                  "shrink-0 rounded px-1.5 py-0.5 text-xs tabular-nums",
                  dueDateStatusColors[getDueDateStatus(task.dueDate)],
                )}
              >
                {formatDateMedium(task.dueDate)}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function WorkspaceTasks({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const { t } = useTranslation();
  const [scope, setScope] = useState<WorkspaceTaskScope>("mine");
  const { data, isPending, isError, refetch } = useWorkspaceTasks(
    workspaceId,
    scope,
    TASK_LIMIT,
  );

  const tasks = data?.tasks ?? [];
  const total = data?.total ?? 0;

  return (
    <ChartCard
      title={t("workspace:overview.myTasks.title")}
      description={t("workspace:overview.myTasks.description")}
      action={
        <Tabs
          value={scope}
          onValueChange={(value) => setScope(value as WorkspaceTaskScope)}
        >
          <TabsList>
            <TabsTrigger value="mine">
              {t("workspace:overview.myTasks.tabMine")}
            </TabsTrigger>
            <TabsTrigger value="all">
              {t("workspace:overview.myTasks.tabAll")}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      }
    >
      {isPending ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-12 rounded-md" />
          ))}
        </div>
      ) : isError ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 py-2"
        >
          <p className="text-sm">{t("workspace:overview.myTasks.error")}</p>
          <Button variant="outline" onClick={() => refetch()}>
            {t("workspace:overview.schedule.retry")}
          </Button>
        </div>
      ) : tasks.length ? (
        <div className="space-y-3">
          <TaskQueue tasks={tasks} workspaceId={workspaceId} />
          {total > tasks.length && (
            <p className="text-muted-foreground text-xs">
              {t("workspace:overview.myTasks.showing", {
                count: tasks.length,
                total,
              })}
            </p>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          {scope === "mine"
            ? t("workspace:overview.myTasks.emptyMine")
            : t("workspace:overview.myTasks.emptyAll")}
        </p>
      )}
    </ChartCard>
  );
}
