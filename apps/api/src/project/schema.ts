import { z } from "../openapi";

export const projectParam = z.object({ id: z.string() });

export const workspaceIdQuery = z.object({ workspaceId: z.string() });

export const listProjectsQuery = z.object({
  workspaceId: z.string(),
  includeArchived: z.string().optional().openapi({
    description: 'Pass "true" to include archived projects in the list.',
  }),
});

export const createProjectBody = z.object({
  accessMode: z.enum(["workspace", "restricted"]).optional(),
  name: z.string(),
  workspaceId: z.string(),
  icon: z.string(),
  slug: z.string(),
});

export const updateProjectBody = z.object({
  accessMode: z.enum(["workspace", "restricted"]).optional(),
  name: z.string(),
  icon: z.string(),
  slug: z.string(),
  description: z.string(),
  isPublic: z.boolean(),
});

export const reorderProjectsBody = z.object({
  // Positions express a relative order only; the controller renumbers the
  // workspace to 0..n-1, so the values just have to be sane.
  projects: z
    .array(z.object({ id: z.string(), position: z.number().int().min(0) }))
    .min(1),
});

export const projectMemberParam = z.object({
  id: z.string(),
  userId: z.string(),
});
export const projectAccessBody = z.object({
  accessMode: z.enum(["workspace", "restricted"]),
});

// Query values arrive as strings, so a bare `Number()` would let `NaN` reach the
// offset clause. The regex rejects that before the transform runs.
const pagingNumber = (min: number, max: number) =>
  z
    .string()
    .regex(/^\d+$/, "Expected a positive integer")
    .transform(Number)
    .pipe(z.number().int().min(min).max(max));

export const projectFilesParam = z.object({ projectId: z.string() });

export const projectFilesQuery = z.object({
  q: z.string().optional().openapi({
    description:
      "Free-text filter, matched against the filename, the source task title, and the uploader's name. Overrides `sort` so the closest matches come first.",
  }),
  kind: z
    .enum(["all", "image", "attachment"])
    .optional()
    .default("all")
    .openapi({
      description:
        "Restrict to images that render inline or to files attached for download.",
    }),
  uploadedBy: z.string().optional().openapi({
    description: "Only files uploaded by this workspace user ID.",
  }),
  sort: z
    .enum(["newest", "oldest", "name", "largest"])
    .optional()
    .default("newest")
    .openapi({ description: "Ignored while `q` is set." }),
  page: pagingNumber(1, 1_000_000).optional(),
  limit: pagingNumber(1, 100).optional(),
});
