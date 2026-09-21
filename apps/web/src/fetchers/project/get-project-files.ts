import { client } from "@maki/libs";
import type { InferResponseType } from "hono/client";
import { HttpError } from "@/lib/http-error";

export type ProjectFileKind = "all" | "image" | "attachment";
export type ProjectFileSort = "newest" | "oldest" | "name" | "largest";

export type ProjectFilesResponse = InferResponseType<
  (typeof client)["project"][":projectId"]["files"]["$get"],
  200
>;
export type ProjectFile = ProjectFilesResponse["data"][number];

export type GetProjectFilesParams = {
  projectId: string;
  q?: string;
  kind?: ProjectFileKind;
  uploadedBy?: string;
  sort?: ProjectFileSort;
  page?: number;
  limit?: number;
};

async function getProjectFiles({
  projectId,
  page,
  limit,
  ...query
}: GetProjectFilesParams) {
  const response = await client.project[":projectId"].files.$get({
    param: { projectId },
    query: {
      ...query,
      // The route parses paging values out of the query string, so they go over
      // the wire as strings even though callers pass numbers.
      page: page?.toString(),
      limit: limit?.toString(),
    },
  });

  if (!response.ok) {
    throw new HttpError(response.status, "Failed to fetch project files");
  }

  return await response.json();
}

export default getProjectFiles;
