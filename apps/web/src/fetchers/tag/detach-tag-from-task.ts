import { client } from "@maki/libs";

export type DetachTagFromTaskRequest = {
  tagId: string;
};

async function detachTagFromTask({ tagId }: DetachTagFromTaskRequest) {
  const response = await client.tag[":id"].task.$delete({
    param: { id: tagId },
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

export default detachTagFromTask;
