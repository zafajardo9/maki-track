import type { QueryClient } from "@tanstack/react-query";
import getProject from "@/fetchers/project/get-project";
import { HttpError } from "@/lib/http-error";
import useProjectStore from "@/store/project";

export async function refreshProjectAccess(
  client: QueryClient,
  revoked = false,
) {
  const project = useProjectStore.getState().project;
  const affected = new Set(["projects", "tasks", "task", "project-members", "activities", "comments", "notifications", "notification-preferences", "search", "tags", "labels", "task-relations", "workspace-capabilities", "workspace-user", "workspace-users", "workspace-roles", "active-workspace-users", "files", "time-entries", "columns", "external-links", "github-integration", "gitea-integration", "slack-integration", "discord-integration", "telegram-integration", "generic-webhook-integration"]);
  const filter = { predicate: (query: { queryKey: readonly unknown[] }) => affected.has(String(query.queryKey[0])) };
  await client.cancelQueries(filter);
  useProjectStore.getState().setProject(undefined);
  // Access affects cross-project aggregates and task caches as well as boards.
  // Reset clears previously authorized data before fetching the new view.
  void client.resetQueries(filter);
  if (!project) return;
  if (!revoked) {
    try {
      await getProject({ id: project.id, workspaceId: project.workspaceId });
      return;
    } catch (error) {
      if (!(error instanceof HttpError && error.status === 404)) return;
    }
  }
  window.location.assign(
    `/dashboard/workspace/${encodeURIComponent(project.workspaceId)}`,
  );
}
