import {
  apiRouter,
  createRoute,
  errorResponse,
  jsonResponse,
} from "../openapi";
import { requireWorkspacePermission } from "../utils/require-workspace-permission";
import { workspaceAccess } from "../utils/workspace-access-middleware";
import assignTagToTask from "./controllers/assign-tag-to-task";
import createTag from "./controllers/create-tag";
import deleteTag from "./controllers/delete-tag";
import getTagsByProjectId from "./controllers/get-tags-by-project-id";
import unassignTagFromTask from "./controllers/unassign-tag-from-task";
import updateTag from "./controllers/update-tag";
import { tagListSchema, tagSchema } from "./response";
import {
  attachTagBody,
  createTagBody,
  projectIdParam,
  tagParam,
  updateTagBody,
} from "./schema";

const getProjectTagsRoute = createRoute({
  method: "get",
  operationId: "getProjectTags",
  path: "/project/{projectId}",
  tags: ["Tags"],
  summary: "Get project tags",
  description: "Get all tags for a specific project",
  middleware: [workspaceAccess.fromProject("projectId")] as const,
  request: { params: projectIdParam },
  responses: {
    404: errorResponse("Resource not found or inaccessible"),
    200: jsonResponse("List of tags in the project", tagListSchema),
    400: errorResponse(
      "Unknown project, or its workspace could not be determined",
    ),
    403: errorResponse("No access to the project's workspace"),
  },
});

const createTagRoute = createRoute({
  method: "post",
  operationId: "createTag",
  path: "/",
  tags: ["Tags"],
  summary: "Create tag",
  description: "Create a new tag in a project",
  middleware: [
    workspaceAccess.fromProject("projectId"),
    requireWorkspacePermission({ tag: ["create"] }),
  ] as const,
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: createTagBody } },
    },
  },
  responses: {
    200: jsonResponse("Tag created successfully", tagSchema),
    400: errorResponse("Invalid body, project not found, or not a project tag"),
    403: errorResponse("No workspace access, or missing tag:create permission"),
    404: errorResponse("Project not found"),
  },
});

const updateTagRoute = createRoute({
  method: "put",
  operationId: "updateTag",
  path: "/{id}",
  tags: ["Tags"],
  summary: "Update tag",
  description: "Update an existing tag, cascading within its project",
  middleware: [
    workspaceAccess.fromLabel(),
    requireWorkspacePermission({ tag: ["update"] }),
  ] as const,
  request: {
    params: tagParam,
    body: {
      required: true,
      content: { "application/json": { schema: updateTagBody } },
    },
  },
  responses: {
    404: errorResponse("Resource not found or inaccessible"),
    200: jsonResponse("Tag updated successfully", tagSchema),
    409: errorResponse(
      "A tag with this name already exists in the project or on an affected task",
    ),
    400: errorResponse("Invalid body, or the row is not a project tag"),
    403: errorResponse("No workspace access, or missing tag:update permission"),
  },
});

const deleteTagRoute = createRoute({
  method: "delete",
  operationId: "deleteTag",
  path: "/{id}",
  tags: ["Tags"],
  summary: "Delete tag",
  description: "Delete a tag and its copies within its project",
  middleware: [
    workspaceAccess.fromLabel(),
    requireWorkspacePermission({ tag: ["delete"] }),
  ] as const,
  request: { params: tagParam },
  responses: {
    404: errorResponse("Resource not found or inaccessible"),
    200: jsonResponse("Tag deleted successfully", tagSchema),
    400: errorResponse("Unknown tag, or the row is not a project tag"),
    403: errorResponse("No workspace access, or missing tag:delete permission"),
  },
});

const attachTagToTaskRoute = createRoute({
  method: "put",
  operationId: "attachTagToTask",
  path: "/{id}/task",
  tags: ["Tags"],
  summary: "Attach tag to task",
  description: "Attach an existing tag to a task",
  middleware: [
    workspaceAccess.fromLabel(),
    requireWorkspacePermission({ tag: ["update"] }),
  ] as const,
  request: {
    params: tagParam,
    body: {
      required: true,
      content: { "application/json": { schema: attachTagBody } },
    },
  },
  responses: {
    200: jsonResponse("Tag attached to task successfully", tagSchema),
    400: errorResponse(
      "Unknown tag, tag and task in different projects, or not a project tag",
    ),
    403: errorResponse("No workspace access, or missing tag:update permission"),
    404: errorResponse("Task not found"),
  },
});

const detachTagFromTaskRoute = createRoute({
  method: "delete",
  operationId: "detachTagFromTask",
  path: "/{id}/task",
  tags: ["Tags"],
  summary: "Detach tag from task",
  description: "Detach a tag from its current task",
  middleware: [
    workspaceAccess.fromLabel(),
    requireWorkspacePermission({ tag: ["update"] }),
  ] as const,
  request: { params: tagParam },
  responses: {
    200: jsonResponse("Tag detached from task successfully", tagSchema),
    400: errorResponse("Unknown tag, or tag is not assigned to a task"),
    403: errorResponse("No workspace access, or missing tag:update permission"),
    404: errorResponse("Task not found"),
  },
});

const tag = apiRouter()
  .openapi(getProjectTagsRoute, async (c) => {
    const { projectId } = c.req.valid("param");
    return c.json(await getTagsByProjectId(projectId), 200);
  })
  .openapi(createTagRoute, async (c) => {
    const { name, color, projectId } = c.req.valid("json");
    return c.json(await createTag(name, color, projectId), 200);
  })
  .openapi(updateTagRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { name, color } = c.req.valid("json");
    return c.json(await updateTag(id, name, color), 200);
  })
  .openapi(deleteTagRoute, async (c) => {
    const { id } = c.req.valid("param");
    const userId = c.get("userId");
    return c.json(await deleteTag(id, userId), 200);
  })
  .openapi(attachTagToTaskRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { taskId } = c.req.valid("json");
    const userId = c.get("userId");
    return c.json(await assignTagToTask(id, taskId, userId), 200);
  })
  .openapi(detachTagFromTaskRoute, async (c) => {
    const { id } = c.req.valid("param");
    const userId = c.get("userId");
    return c.json(await unassignTagFromTask(id, userId), 200);
  });

export default tag;
