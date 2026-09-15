import { useQuery } from "@tanstack/react-query";
import getProjects from "@/fetchers/project/get-projects";
import { isUnauthorizedError } from "@/lib/http-error";

function useGetProjects({
  workspaceId,
  refresh = false,
}: {
  workspaceId: string;
  refresh?: boolean;
}) {
  return useQuery({
    queryFn: () => getProjects({ workspaceId }),
    queryKey: ["projects", workspaceId],
    enabled: !!workspaceId,
    refetchInterval: (query) =>
      refresh && !isUnauthorizedError(query.state.error) ? 30000 : false,
  });
}

export default useGetProjects;
