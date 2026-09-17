import { client } from "@maki/libs";
import type { InferRequestType } from "hono/client";

export type CreateTagRequest = InferRequestType<
  (typeof client)["tag"]["$post"]
>["json"];

async function createTag({ name, color, projectId }: CreateTagRequest) {
  const response = await client.tag.$post({
    json: {
      name,
      color,
      projectId,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

export default createTag;
