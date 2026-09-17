import { client } from "@maki/libs";

export type AttachTagToTaskRequest = {
  tagId: string;
  taskId: string;
};

async function attachTagToTask({ tagId, taskId }: AttachTagToTaskRequest) {
  const response = await client.tag[":id"].task.$put({
    param: { id: tagId },
    json: { taskId },
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

export default attachTagToTask;
