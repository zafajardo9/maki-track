import { useQuery } from "@tanstack/react-query";
import getWorkspaceTasks, {
  type WorkspaceTaskScope,
} from "@/fetchers/workspace/get-workspace-tasks";
import { isUnauthorizedError } from "@/lib/http-error";

export default function useWorkspaceTasks(
  workspaceId: string,
  scope: WorkspaceTaskScope,
  limit: number,
) {
  return useQuery({
    // Existing task/project mutations invalidate the projects prefix.
    queryKey: ["projects", workspaceId, "tasks", scope, limit],
    queryFn: () => getWorkspaceTasks(workspaceId, scope, limit),
    enabled: !!workspaceId,
    // The workspace has no project socket; refresh other members' changes and
    // the overdue boundary.
    refetchInterval: (query) =>
      isUnauthorizedError(query.state.error) ? false : 30000,
  });
}
