import { useMutation, useQueryClient } from "@tanstack/react-query";
import updateTag from "@/fetchers/tag/update-tag";

function useUpdateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTag,
    onSuccess: (updatedTag) => {
      // Renames/recolors cascade to copies in the project; those copies are
      // also served from the label queries, so everything label- and
      // task-shaped has to refetch.
      void queryClient.invalidateQueries({
        queryKey: ["tags", updatedTag.projectId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["tags"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["labels"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["tasks"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["task"],
      });
    },
  });
}

export default useUpdateTag;
