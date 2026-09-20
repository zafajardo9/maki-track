import { z } from "../openapi";

export const workspaceIdParam = z.object({ workspaceId: z.string() });

// Filters arrive as strings over the wire. `mine` is the default because the
// dashboard card is a personal work queue before it is a workspace feed.
export const workspaceTasksQuery = z.object({
  scope: z.enum(["mine", "all"]).optional().default("mine"),
  limit: z
    .string()
    .optional()
    .default("8")
    .transform(Number)
    .pipe(
      z
        .number()
        .int("Limit must be an integer")
        .min(1, "Limit must be at least 1")
        .max(20, "Limit must not exceed 20"),
    ),
});
