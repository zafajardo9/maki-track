import {
  apiRouter,
  type BaseVariables,
  createRoute,
  errorResponse,
  jsonResponse,
} from "../openapi";
import { workspaceAccess } from "../utils/workspace-access-middleware";
import getWorkspaceMembersCtrl from "./controllers/get-workspace-members";
import getWorkspaceSchedule from "./controllers/get-workspace-schedule";
import { workspaceMemberListSchema, workspaceScheduleSchema } from "./response";
import { workspaceIdParam } from "./schema";

const getWorkspaceMembersRoute = createRoute({
  method: "get",
  operationId: "getWorkspaceMembers",
  path: "/{workspaceId}/members",
  tags: ["Workspaces"],
  summary: "Get workspace members",
  description: "Get all members of a workspace, with their role.",
  middleware: [workspaceAccess.fromParam("workspaceId")] as const,
  request: { params: workspaceIdParam },
  responses: {
    200: jsonResponse("List of workspace members", workspaceMemberListSchema),
    400: errorResponse("Workspace ID could not be determined"),
    403: errorResponse("No access to the workspace"),
  },
});

const getWorkspaceScheduleRoute = createRoute({
  method: "get",
  operationId: "getWorkspaceSchedule",
  path: "/{workspaceId}/schedule",
  tags: ["Workspaces"],
  summary: "Get workspace deadlines",
  description:
    "Counts and the earliest eight overdue and next-seven-day deadlines for open tasks in non-archived projects. Uses the current instant as the overdue boundary. Excludes completed, planned, and archived tasks. Lists sort by due date then ID.",
  middleware: [workspaceAccess.fromParam("workspaceId")] as const,
  request: { params: workspaceIdParam },
  responses: {
    200: jsonResponse("Workspace deadline summary", workspaceScheduleSchema),
    401: errorResponse("Unauthorized"),
    403: errorResponse("No access to the workspace"),
  },
});

const workspace = apiRouter<BaseVariables & { workspaceId: string }>()
  .openapi(getWorkspaceMembersRoute, async (c) =>
    c.json(await getWorkspaceMembersCtrl(c.get("workspaceId")), 200),
  )
  .openapi(getWorkspaceScheduleRoute, async (c) =>
    c.json(await getWorkspaceSchedule(c.get("workspaceId")), 200),
  );

export default workspace;
