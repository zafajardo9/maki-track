import { client } from "@maki/libs";
import type { InferRequestType } from "hono/client";

export type GetTagsByProjectRequest = InferRequestType<
  (typeof client)["tag"]["project"][":projectId"]["$get"]
>["param"];

async function getTagsByProject({ projectId }: GetTagsByProjectRequest) {
  const response = await client.tag.project[":projectId"].$get({
    param: {
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

export default getTagsByProject;
