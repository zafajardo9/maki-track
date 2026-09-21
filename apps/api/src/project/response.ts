import { nullableResponseTimestamp, responseTimestamp, z } from "../openapi";
import { boardColumnSchema, boardTaskSchema } from "../task/response";

export const projectSchema = z
  .object({
    accessMode: z.enum(["workspace", "restricted"]),
    id: z.string(),
    workspaceId: z.string(),
    slug: z.string().openapi({
      description: "Short prefix used in task identifiers, e.g. KAN-12.",
    }),
    icon: z.string().nullable(),
    name: z.string(),
    description: z.string().nullable(),
    createdAt: responseTimestamp,
    isPublic: z.boolean().nullable().openapi({
      description:
        "When true the project's board is readable without signing in, via /api/public-project/{id}.",
    }),
    archivedAt: nullableResponseTimestamp.openapi({
      description:
        "Non-null once archived; archived projects are hidden by default.",
    }),
    position: z.number().openapi({ description: "Sidebar order, ascending." }),
    lastTaskNumber: z.number().openapi({
      description:
        "Highest task number issued in this project; the next task gets this plus one.",
    }),
  })
  .openapi("Project");

export const projectStatisticsSchema = z
  .object({
    totalTasks: z.number().openapi({
      description:
        "Every task in the project, including the ones parked in the planned and archived buckets.",
    }),
    completedTasks: z.number().openapi({
      description:
        "Tasks sitting in a column marked final. Completion is a property of the column, not of a hardcoded status slug.",
    }),
    openTasks: z.number().openapi({
      description:
        "Tasks sitting in a column that is not marked final. Excludes planned and archived tasks, which belong to no column.",
    }),
    overdueTasks: z.number().openapi({
      description:
        "Open tasks whose due date has already passed. Completed, planned, and archived tasks are never counted.",
    }),
    completionPercentage: z.number().openapi({
      description:
        "completedTasks / (completedTasks + openTasks), rounded. Planned and archived tasks are outside this population, so parking work neither raises nor lowers it.",
    }),
    byPriority: z.record(z.string(), z.number()).openapi({
      description:
        "Task counts keyed by priority (no-priority, low, medium, high, urgent) across all of the project's tasks, backlog included.",
    }),
    dueDate: nullableResponseTimestamp.openapi({
      description: "The soonest due date among the project's open tasks.",
    }),
  })
  .openapi("ProjectStatistics");

export const projectListItemSchema = projectSchema
  .extend({
    statistics: projectStatisticsSchema,
    // Legacy, always empty. Fetch the board via GET /task/tasks/{id}.
    archivedTasks: z
      .array(boardTaskSchema)
      .openapi({ description: "Always empty." }),
    plannedTasks: z
      .array(boardTaskSchema)
      .openapi({ description: "Always empty." }),
    columns: z
      .array(boardColumnSchema)
      .openapi({ description: "Always empty." }),
  })
  .openapi("ProjectListItem");

export const projectListSchema = z.array(projectListItemSchema);

export const projectMemberSchema = z
  .object({
    userId: z.string(),
    name: z.string(),
    email: z.string(),
    role: z.string(),
    explicit: z.boolean(),
    inherited: z.boolean(),
  })
  .openapi("ProjectMember");

export const projectFileSourceSchema = z
  .object({
    id: z.string(),
    number: z.number(),
    title: z.string(),
  })
  .openapi("ProjectFileSource");

export const projectFileUploaderSchema = z
  .object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string(),
    image: z.string().nullable(),
  })
  .openapi("ProjectFileUploader");

export const projectFileSchema = z
  .object({
    id: z.string(),
    filename: z.string(),
    mimeType: z.string(),
    size: z.number().openapi({ description: "Size in bytes." }),
    kind: z.enum(["image", "attachment"]).openapi({
      description:
        "`image` for files the editor renders inline, `attachment` for everything else uploaded for download.",
    }),
    surface: z.enum(["description", "comment"]).openapi({
      description:
        "Where the file was uploaded from: a task description or a task comment.",
    }),
    url: z.string().openapi({
      description:
        "Absolute download URL, served by `GET /api/asset/{id}` with the same workspace authorization.",
    }),
    createdAt: responseTimestamp,
    task: projectFileSourceSchema.nullable().openapi({
      description:
        "The task the file was uploaded to, or null once that task is gone.",
    }),
    activityId: z.string().nullable().openapi({
      description: "The comment the file belongs to, when it came from one.",
    }),
    uploadedBy: projectFileUploaderSchema.nullable().openapi({
      description: "Null for files whose uploader has since been deleted.",
    }),
  })
  .openapi("ProjectFile");

export const projectFileListSchema = z
  .object({
    data: z.array(projectFileSchema),
    pagination: z
      .object({
        total: z.number().openapi({
          description: "Every file matching the filters, not just this page.",
        }),
        page: z.number(),
        pageSize: z.number(),
        totalPages: z.number(),
      })
      .openapi("ProjectFilePagination"),
    totalSize: z.number().openapi({
      description:
        "Sum of `size` across every matching file, so a caller can show a repository total without walking the pages.",
    }),
  })
  .openapi("ProjectFileList");
