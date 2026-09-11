import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ProjectOverview } from "@/components/charts/project-overview";
import ProjectLayout from "@/components/common/project-layout";
import PageTitle from "@/components/page-title";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetTasks } from "@/hooks/queries/task/use-get-tasks";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/project/$projectId/overview",
)({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useTranslation();
  const { projectId, workspaceId } = Route.useParams();
  const navigate = useNavigate();
  // The board payload already carries every column with its tasks, which is all
  // the overview needs. Reads the same query key the board uses, so the two
  // views share one cache entry and inherit the realtime invalidation.
  const { data } = useGetTasks(projectId);

  // Deadlines are actionable, and the board already knows how to open a task in
  // its detail sheet from `?taskId=`. Handing off keeps one implementation of
  // that instead of a second one here.
  const openTask = (taskId: string) => {
    navigate({
      to: "/dashboard/workspace/$workspaceId/project/$projectId/board",
      params: { workspaceId, projectId },
      search: { taskId },
    });
  };

  return (
    <ProjectLayout
      projectId={projectId}
      workspaceId={workspaceId}
      activeView="overview"
    >
      <PageTitle title={t("tasks:view.overview")} hideAppName />

      <div className="h-full min-h-0 overflow-auto bg-background p-4 sm:p-6">
        {data ? (
          <ProjectOverview
            columns={data.columns}
            plannedTasks={data.plannedTasks}
            archivedTasks={data.archivedTasks}
            onOpenTask={openTask}
          />
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-52 rounded-2xl" />
              ))}
            </div>
          </div>
        )}
      </div>
    </ProjectLayout>
  );
}
