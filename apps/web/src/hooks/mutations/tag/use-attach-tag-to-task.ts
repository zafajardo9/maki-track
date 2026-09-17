import { useMutation, useQueryClient } from "@tanstack/react-query";
import attachTagToTask from "@/fetchers/tag/attach-tag-to-task";
import { addLabelToTaskInTasksCache } from "../label/sync-task-labels-cache";

export default function useAttachTagToTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: attachTagToTask,
    onSuccess: (attachedTag) => {
      if (!attachedTag.taskId) return;

      if (attachedTag.projectId) {
        queryClient.setQueryData(
          ["tags", attachedTag.projectId],
          (existingTags: Array<typeof attachedTag> | undefined) => {
            if (!existingTags) return [attachedTag];
            if (existingTags.some((tag) => tag.id === attachedTag.id)) {
              return existingTags;
            }
            return [...existingTags, attachedTag];
          },
        );
      }

      queryClient.setQueryData(
        ["labels", attachedTag.taskId],
        (existingLabels: Array<typeof attachedTag> | undefined) => {
          if (!existingLabels) return [attachedTag];
          if (existingLabels.some((label) => label.id === attachedTag.id)) {
            return existingLabels;
          }
          return [...existingLabels, attachedTag];
        },
      );

      addLabelToTaskInTasksCache(queryClient, attachedTag.taskId, {
        id: attachedTag.id,
        name: attachedTag.name,
        color: attachedTag.color,
        projectId: attachedTag.projectId,
      });

      void queryClient.invalidateQueries({
        queryKey: ["labels", attachedTag.taskId],
      });

      if (attachedTag.projectId) {
        void queryClient.invalidateQueries({
          queryKey: ["tags", attachedTag.projectId],
        });
      }
    },
  });
}
