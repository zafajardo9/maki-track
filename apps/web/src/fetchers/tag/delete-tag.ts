import { client } from "@maki/libs";
import type { InferRequestType } from "hono/client";

export type DeleteTagRequest = InferRequestType<
  (typeof client)["tag"][":id"]["$delete"]
>["param"];

async function deleteTag({ id }: DeleteTagRequest) {
  const response = await client.tag[":id"].$delete({
    param: { id },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();

  return data;
}

export default deleteTag;
