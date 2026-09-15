import { nullableResponseTimestamp, responseTimestamp, z } from "../openapi";

export const workspaceMemberSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    image: z.string().nullable(),
    role: z.string().openapi({
      description:
        "The member's workspace role: a built-in role (owner, admin, member, guest) or a custom role name.",
    }),
  })
  .openapi("WorkspaceMember");

export const workspaceMemberListSchema = z.array(workspaceMemberSchema);

export const workspaceDeadlineSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    number: z.number().nullable(),
    projectId: z.string(),
    projectName: z.string(),
    projectSlug: z.string(),
    status: z.string(),
    statusName: z.string(),
    dueDate: nullableResponseTimestamp,
    createdAt: responseTimestamp,
  })
  .openapi("WorkspaceDeadline");

export const workspaceScheduleSchema = z
  .object({
    overdue: z.number(),
    upcoming: z.number(),
    noDueDate: z.number(),
    overdueTasks: z.array(workspaceDeadlineSchema),
    upcomingTasks: z.array(workspaceDeadlineSchema),
  })
  .openapi("WorkspaceSchedule");
