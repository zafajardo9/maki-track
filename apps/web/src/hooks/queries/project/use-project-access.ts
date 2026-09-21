import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getProjectMembers,
  setProjectAccess,
  setProjectMember,
} from "@/fetchers/project/access";

export function useProjectAccess(projectId: string, enabled: boolean) {
  const client = useQueryClient();
  const refresh = async () => {
    await Promise.all(
      [
        "project-members",
        "project",
        "projects",
        "tasks",
        "workspace-tasks",
        "workspace-schedule",
        "search",
        "notifications",
      ].map((key) => client.invalidateQueries({ queryKey: [key] })),
    );
  };
  return {
    members: useQuery({
      queryKey: ["project-members", projectId],
      enabled: enabled && !!projectId,
      queryFn: () => getProjectMembers(projectId),
    }),
    membership: useMutation({
      mutationFn: setProjectMember,
      onSuccess: refresh,
    }),
    access: useMutation({ mutationFn: setProjectAccess, onSuccess: refresh }),
  };
}
