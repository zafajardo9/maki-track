import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateTagRequest } from "@/fetchers/tag/create-tag";
import createTag from "@/fetchers/tag/create-tag";

function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTag,
    onSuccess: (createdTag, variables: CreateTagRequest) => {
      queryClient.setQueryData(
        ["tags", variables.projectId],
        (existingTags: Array<typeof createdTag> | undefined) => {
          if (!existingTags) return [createdTag];

          const alreadyExists = existingTags.some(
            (tag) => tag.id === createdTag.id,
          );

          return alreadyExists ? existingTags : [...existingTags, createdTag];
        },
      );

      void queryClient.invalidateQueries({
        queryKey: ["tags", variables.projectId],
      });
    },
  });
}

export default useCreateTag;
