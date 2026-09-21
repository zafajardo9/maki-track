import { client } from "@maki/libs";
import type { InferRequestType } from "hono/client";
import { HttpError } from "@/lib/http-error";

export type GetProjectRequest = InferRequestType<
  (typeof client)["project"][":id"]["$get"]
>["param"] & {
  workspaceId: string;
};

async function getProject({ id }: GetProjectRequest) {
  const response = await client.project[":id"].$get({
    param: { id },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new HttpError(response.status, error);
  }

  const data = await response.json();

  return data;
}

export default getProject;
