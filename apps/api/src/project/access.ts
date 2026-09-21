import {
  apiRouter,
  type BaseVariables,
  createRoute,
  errorResponse,
  jsonResponse,
  z,
} from "../openapi";
import { requireProjectAccessManagement } from "../utils/project-access";
import { workspaceAccess } from "../utils/workspace-access-middleware";
import {
  getProjectMembers,
  setProjectAccessMode,
  setProjectMember,
} from "./controllers/project-access";
import { projectMemberSchema, projectSchema } from "./response";
import { projectAccessBody, projectMemberParam, projectParam } from "./schema";

const middleware = [
  workspaceAccess.fromProject(),
  requireProjectAccessManagement,
];
const errors = {
  400: errorResponse("Invalid request or user outside workspace"),
  403: errorResponse("Missing project:manage_access permission"),
  404: errorResponse("Project not found"),
};
const members = createRoute({
  method: "get",
  path: "/{id}/members",
  operationId: "getProjectMembers",
  tags: ["Projects"],
  summary: "List explicit members and inherited owner/admin access",
  middleware,
  request: { params: projectParam },
  responses: {
    200: jsonResponse("Project members", z.array(projectMemberSchema)),
    ...errors,
  },
});
const add = createRoute({
  method: "put",
  path: "/{id}/members/{userId}",
  operationId: "addProjectMember",
  tags: ["Projects"],
  summary: "Grant an existing workspace member project access",
  middleware,
  request: { params: projectMemberParam },
  responses: {
    200: jsonResponse("Membership updated", z.object({ success: z.boolean() })),
    ...errors,
  },
});
const remove = createRoute({
  method: "delete",
  path: "/{id}/members/{userId}",
  operationId: "removeProjectMember",
  tags: ["Projects"],
  summary: "Remove explicit membership; inherited role access remains",
  middleware,
  request: { params: projectMemberParam },
  responses: {
    200: jsonResponse("Membership updated", z.object({ success: z.boolean() })),
    ...errors,
  },
});
const access = createRoute({
  method: "put",
  path: "/{id}/access",
  operationId: "setProjectAccess",
  tags: ["Projects"],
  summary: "Change project access; restricting disables public sharing",
  middleware,
  request: {
    params: projectParam,
    body: {
      required: true,
      content: { "application/json": { schema: projectAccessBody } },
    },
  },
  responses: { 200: jsonResponse("Updated project", projectSchema), ...errors },
});

export default apiRouter<BaseVariables & { workspaceId: string }>()
  .openapi(members, async (c) =>
    c.json(
      await getProjectMembers(c.req.valid("param").id, c.get("workspaceId")),
      200,
    ),
  )
  .openapi(add, async (c) => {
    const { id, userId } = c.req.valid("param");
    await setProjectMember(id, c.get("workspaceId"), userId, true);
    return c.json({ success: true }, 200);
  })
  .openapi(remove, async (c) => {
    const { id, userId } = c.req.valid("param");
    await setProjectMember(id, c.get("workspaceId"), userId, false);
    return c.json({ success: true }, 200);
  })
  .openapi(access, async (c) =>
    c.json(
      await setProjectAccessMode(
        c.req.valid("param").id,
        c.get("workspaceId"),
        c.req.valid("json").accessMode,
      ),
      200,
    ),
  );
