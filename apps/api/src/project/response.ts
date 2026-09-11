import { nullableResponseTimestamp, responseTimestamp, z } from "../openapi";
import { boardColumnSchema, boardTaskSchema } from "../task/response";

export const projectSchema = z
  .object({
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
