import { responseTimestamp, z } from "../openapi";

export const labelSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    color: z.string(),
    createdAt: responseTimestamp,
    updatedAt: responseTimestamp,
    taskId: z.string().nullable(),
    workspaceId: z.string().nullable(),
    // NULL for workspace-wide labels; set when the row is a project tag.
    projectId: z.string().nullable(),
  })
  .openapi("Label");

export const labelListSchema = z.array(labelSchema);
