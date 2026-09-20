import { client } from "@maki/libs";
import { HttpError } from "@/lib/http-error";

export type WorkspaceTaskScope = "mine" | "all";

export default async function getWorkspaceTasks(
  workspaceId: string,
  scope: WorkspaceTaskScope,
  limit: number,
) {
  const response = await client.workspace[":workspaceId"].tasks.$get({
    param: { workspaceId },
    query: { scope, limit: limit.toString() },
  });
  if (!response.ok)
    throw new HttpError(response.status, "Failed to fetch workspace tasks");
  return response.json();
}
