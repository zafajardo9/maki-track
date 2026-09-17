import { useMutation, useQueryClient } from "@tanstack/react-query";
import detachTagFromTask from "@/fetchers/tag/detach-tag-from-task";
import { removeLabelFromTaskInTasksCache } from "../label/sync-task-labels-cache";

export default function useDetachTagFromTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: detachTagFromTask,
    onSuccess: (detachedTag) => {
      if (!detachedTag.taskId) return;

      queryClient.setQueryData(
        ["labels", detachedTag.taskId],
        (existingLabels: Array<typeof detachedTag> | undefined) =>
          existingLabels?.filter((label) => label.id !== detachedTag.id) ?? [],
      );

      removeLabelFromTaskInTasksCache(
        queryClient,
        detachedTag.taskId,
        detachedTag.id,
      );

      void queryClient.invalidateQueries({
        queryKey: ["labels", detachedTag.taskId],
      });

      if (detachedTag.projectId) {
        void queryClient.invalidateQueries({
          queryKey: ["tags", detachedTag.projectId],
        });
      }
    },
  });
}
