import { createFileRoute } from "@tanstack/react-router";
import ProjectTagsSettings from "@/components/project/project-tags-settings";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/settings/projects/$projectId/tags",
)({
  component: RouteComponent,
});

function RouteComponent() {
  const { projectId } = Route.useParams();

  return <ProjectTagsSettings projectId={projectId} />;
}
