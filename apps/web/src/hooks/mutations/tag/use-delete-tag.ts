import { useMutation, useQueryClient } from "@tanstack/react-query";
import deleteTag from "@/fetchers/tag/delete-tag";

function useDeleteTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTag,
    onSuccess: (deletedTag) => {
      void queryClient.invalidateQueries({
        queryKey: ["tags", deletedTag.projectId],
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

export default useDeleteTag;
