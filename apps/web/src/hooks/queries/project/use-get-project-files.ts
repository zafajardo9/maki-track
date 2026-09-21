import { useQuery } from "@tanstack/react-query";
import getProjectFiles, {
  type ProjectFileKind,
  type ProjectFileSort,
} from "@/fetchers/project/get-project-files";

export type ProjectFilesFilters = {
  projectId: string;
  q?: string;
  kind?: ProjectFileKind;
  uploadedBy?: string;
  sort?: ProjectFileSort;
  page?: number;
  limit?: number;
};

function useGetProjectFiles({ projectId, ...filters }: ProjectFilesFilters) {
  return useQuery({
    // The filters are part of the key so each search result set caches
    // separately, while `["files", projectId]` still invalidates them all.
    queryKey: ["files", projectId, filters],
    queryFn: () => getProjectFiles({ projectId, ...filters }),
    enabled: !!projectId,
  });
}

export default useGetProjectFiles;
