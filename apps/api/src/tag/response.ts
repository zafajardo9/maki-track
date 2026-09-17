import { responseTimestamp, z } from "../openapi";

export const tagSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    color: z.string(),
    createdAt: responseTimestamp,
    updatedAt: responseTimestamp,
    taskId: z.string().nullable(),
    workspaceId: z.string().nullable(),
    projectId: z.string().nullable(),
  })
  .openapi("Tag");

export const tagListSchema = z.array(tagSchema);
