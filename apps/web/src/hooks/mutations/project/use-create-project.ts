import { useMutation } from "@tanstack/react-query";
import createProject from "@/fetchers/project/create-project";

function useCreateProject({
  name,
  slug,
  workspaceId,
  icon,
  accessMode,
}: {
  name: string;
  slug: string;
  workspaceId: string;
  icon: string;
  accessMode?: "workspace" | "restricted";
}) {
  return useMutation({
    mutationFn: () =>
      createProject({ name, slug, workspaceId, icon, accessMode }),
  });
}

export default useCreateProject;
