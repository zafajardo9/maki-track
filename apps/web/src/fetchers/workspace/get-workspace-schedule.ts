import { client } from "@maki/libs";
import { HttpError } from "@/lib/http-error";

export default async function getWorkspaceSchedule(workspaceId: string) {
  const response = await client.workspace[":workspaceId"].schedule.$get({
    param: { workspaceId },
  });
  if (!response.ok)
    throw new HttpError(response.status, "Failed to fetch workspace schedule");
  return response.json();
}
