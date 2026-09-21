import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import ProjectLayout from "@/components/common/project-layout";
import PageTitle from "@/components/page-title";
import ProjectFiles from "@/components/project/project-files";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/project/$projectId/files",
)({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useTranslation();
  const { projectId, workspaceId } = Route.useParams();

  return (
    <ProjectLayout
      projectId={projectId}
      workspaceId={workspaceId}
      activeView="files"
    >
      <PageTitle title={t("files:title")} hideAppName />

      <ProjectFiles projectId={projectId} workspaceId={workspaceId} />
    </ProjectLayout>
  );
}
