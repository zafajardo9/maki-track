import { useQuery } from "@tanstack/react-query";
import getWorkspaceSchedule from "@/fetchers/workspace/get-workspace-schedule";
import { isUnauthorizedError } from "@/lib/http-error";

export default function useWorkspaceSchedule(workspaceId: string) {
  return useQuery({
    // Existing task/project mutations invalidate the projects prefix.
    queryKey: ["projects", workspaceId, "schedule"],
    queryFn: () => getWorkspaceSchedule(workspaceId),
    enabled: !!workspaceId,
    // The workspace has no project socket; refresh other members' changes and time boundaries.
    refetchInterval: (query) =>
      isUnauthorizedError(query.state.error) ? false : 30000,
  });
}
