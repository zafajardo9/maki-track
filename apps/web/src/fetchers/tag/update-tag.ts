import { client } from "@maki/libs";
import type { InferRequestType } from "hono/client";

export type UpdateTagRequest = InferRequestType<
  (typeof client)["tag"][":id"]["$put"]
>["json"] &
  InferRequestType<(typeof client)["tag"][":id"]["$put"]>["param"];

async function updateTag({ id, name, color }: UpdateTagRequest) {
  const response = await client.tag[":id"].$put({
    param: { id },
    json: { name, color },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

export default updateTag;
