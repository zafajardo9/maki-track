import { useQuery } from "@tanstack/react-query";
import getTagsByProject from "@/fetchers/tag/get-tags-by-project";

function useGetTagsByProject(projectId: string) {
  return useQuery({
    enabled: Boolean(projectId),
    queryKey: ["tags", projectId],
    queryFn: () => getTagsByProject({ projectId }),
  });
}

export default useGetTagsByProject;
