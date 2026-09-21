import { HTTPException } from "hono/http-exception";
import { requireEntitlement } from "../billing/require-entitlement-middleware";
import { publishEvent } from "../events";
import {
  apiRouter,
  type BaseVariables,
  createRoute,
  errorResponse,
  jsonResponse,
  z,
} from "../openapi";
import { normalizeApiServerUrl } from "../utils/openapi-spec";
import {
  assertProjectAccess,
  canManageProjectAccess,
} from "../utils/project-access";
import { requireWorkspacePermission } from "../utils/require-workspace-permission";
import { workspaceAccess } from "../utils/workspace-access-middleware";
import projectAccessRoutes from "./access";
import archiveProjectCtrl from "./controllers/archive-project";
import createProjectCtrl from "./controllers/create-project";
import deleteProjectCtrl from "./controllers/delete-project";
import getProjectCtrl from "./controllers/get-project";
import getProjectFilesCtrl from "./controllers/get-project-files";
import getProjectsCtrl from "./controllers/get-projects";
import reorderProjectsCtrl from "./controllers/reorder-projects";
import { requireProjectVisibilityPermission } from "./controllers/require-project-visibility-permission";
import unarchiveProjectCtrl from "./controllers/unarchive-project";
import updateProjectCtrl from "./controllers/update-project";
import {
  projectFileListSchema,
  projectListSchema,
  projectSchema,
} from "./response";
import {
  createProjectBody,
  listProjectsQuery,
  projectFilesParam,
  projectFilesQuery,
  projectParam,
  reorderProjectsBody,
  updateProjectBody,
  workspaceIdQuery,
} from "./schema";

const listProjectsRoute = createRoute({
  method: "get",
  operationId: "listProjects",
  path: "/",
  tags: ["Projects"],
  summary: "List projects",
  description:
    "List a workspace's projects in sidebar order, each with rollup task statistics. Archived projects are excluded unless includeArchived is set.",
  middleware: [workspaceAccess.fromQuery()] as const,
  request: { query: listProjectsQuery },
  responses: {
    200: jsonResponse("List of projects", projectListSchema),
    400: errorResponse("Workspace ID could not be determined"),
    403: errorResponse("No access to the workspace"),
  },
});

const createProjectRoute = createRoute({
  method: "post",
  operationId: "createProject",
  path: "/",
  tags: ["Projects"],
  summary: "Create project",
  description:
    "Create a project in a workspace. The slug becomes the prefix of its task identifiers.",
  middleware: [
    workspaceAccess.fromBody(),
    requireWorkspacePermission({ project: ["create"] }),
    requireEntitlement,
  ] as const,
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: createProjectBody } },
    },
  },
  responses: {
    200: jsonResponse("The created project", projectSchema),
    400: errorResponse("Invalid body, or workspace ID could not be determined"),
    403: errorResponse(
      "No workspace access, or missing project:create permission",
    ),
  },
});

const getProjectRoute = createRoute({
  method: "get",
  operationId: "getProject",
  path: "/{id}",
  tags: ["Projects"],
  summary: "Get project",
  description: "Get a single project by ID.",
  middleware: [workspaceAccess.fromProject()] as const,
  request: { params: projectParam },
  responses: {
    404: errorResponse("Resource not found or inaccessible"),
    200: jsonResponse("Project details", projectSchema),
    400: errorResponse(
      "Unknown project, or its workspace could not be determined",
    ),
    403: errorResponse("No access to the project's workspace"),
  },
});

const reorderProjectsRoute = createRoute({
  method: "put",
  operationId: "reorderProjects",
  path: "/reorder",
  tags: ["Projects"],
  summary: "Reorder projects",
  description:
    "Set the sidebar order of a workspace's projects. The given positions express relative order only -- the workspace is renumbered to 0..n-1.",
  middleware: [
    workspaceAccess.fromQuery(),
    requireWorkspacePermission({ project: ["update"] }),
  ] as const,
  request: {
    query: workspaceIdQuery,
    body: {
      required: true,
      content: { "application/json": { schema: reorderProjectsBody } },
    },
  },
  responses: {
    // Reorder returns the plain project rows, without the list route's
    // rollup statistics.
    200: jsonResponse("The reordered projects", z.array(projectSchema)),
    400: errorResponse("Invalid body, or workspace ID could not be determined"),
    403: errorResponse(
      "No workspace access, or missing project:update permission",
    ),
  },
});

const updateProjectRoute = createRoute({
  method: "put",
  operationId: "updateProject",
  path: "/{id}",
  tags: ["Projects"],
  summary: "Update project",
  description:
    "Replace a project's name, icon, slug, description, and visibility. Changing visibility also requires project:share.",
  middleware: [
    workspaceAccess.fromProject(),
    requireWorkspacePermission({ project: ["update"] }),
    requireProjectVisibilityPermission,
  ] as const,
  request: {
    params: projectParam,
    body: {
      required: true,
      content: { "application/json": { schema: updateProjectBody } },
    },
  },
  responses: {
    404: errorResponse("Resource not found or inaccessible"),
    200: jsonResponse("The updated project", projectSchema),
    400: errorResponse("Invalid body, or unknown project"),
    403: errorResponse(
      "No workspace access, missing project:update permission, or a visibility change without project:share",
    ),
  },
});

const deleteProjectRoute = createRoute({
  method: "delete",
  operationId: "deleteProject",
  path: "/{id}",
  tags: ["Projects"],
  summary: "Delete project",
  description:
    "Permanently delete a project and everything in it. Archive it instead to keep the data.",
  middleware: [
    workspaceAccess.fromProject(),
    requireWorkspacePermission({ project: ["delete"] }),
  ] as const,
  request: { params: projectParam },
  responses: {
    404: errorResponse("Resource not found or inaccessible"),
    200: jsonResponse("The deleted project", projectSchema),
    400: errorResponse(
      "Unknown project, or its workspace could not be determined",
    ),
    403: errorResponse(
      "No workspace access, or missing project:delete permission",
    ),
  },
});

const archiveProjectRoute = createRoute({
  method: "put",
  operationId: "archiveProject",
  path: "/{id}/archive",
  tags: ["Projects"],
  summary: "Archive project",
  description:
    "Hide a project from the default list without deleting it. Reversible with unarchive.",
  middleware: [
    workspaceAccess.fromProject(),
    requireWorkspacePermission({ project: ["update"] }),
  ] as const,
  request: { params: projectParam },
  responses: {
    404: errorResponse("Resource not found or inaccessible"),
    200: jsonResponse("The archived project", projectSchema),
    400: errorResponse(
      "Unknown project, or its workspace could not be determined",
    ),
    403: errorResponse(
      "No workspace access, or missing project:update permission",
    ),
  },
});

const unarchiveProjectRoute = createRoute({
  method: "put",
  operationId: "unarchiveProject",
  path: "/{id}/unarchive",
  tags: ["Projects"],
  summary: "Unarchive project",
  description: "Return an archived project to the default list.",
  middleware: [
    workspaceAccess.fromProject(),
    requireWorkspacePermission({ project: ["update"] }),
  ] as const,
  request: { params: projectParam },
  responses: {
    404: errorResponse("Resource not found or inaccessible"),
    200: jsonResponse("The restored project", projectSchema),
    400: errorResponse(
      "Unknown project, or its workspace could not be determined",
    ),
    403: errorResponse(
      "No workspace access, or missing project:update permission",
    ),
  },
});

const listProjectFilesRoute = createRoute({
  method: "get",
  operationId: "listProjectFiles",
  path: "/{projectId}/files",
  tags: ["Projects"],
  summary: "List project files",
  description:
    "List the files and documents uploaded to a project's tasks. `q` matches the filename, the source task title, and the uploader's name, and switches the ordering from `sort` to relevance. Every entry carries a `url` that streams through `/asset/{id}`, so the same workspace authorization applies.",
  middleware: [
    workspaceAccess.fromProject("projectId"),
    requireWorkspacePermission({ project: ["read"] }),
  ] as const,
  request: { params: projectFilesParam, query: projectFilesQuery },
  responses: {
    404: errorResponse("Resource not found or inaccessible"),
    200: jsonResponse("Files uploaded to the project", projectFileListSchema),
    400: errorResponse(
      "Unknown project, or its workspace could not be determined",
    ),
    403: errorResponse(
      "No access to the project's workspace, or missing project:read permission",
    ),
  },
});

const project = apiRouter<BaseVariables & { workspaceId: string }>()
  .route("/", projectAccessRoutes)
  .openapi(listProjectsRoute, async (c) => {
    const workspaceId = c.get("workspaceId");
    const { includeArchived } = c.req.valid("query");
    const projects = await getProjectsCtrl(
      workspaceId,
      includeArchived === "true",
      c.get("userId"),
    );
    return c.json(projects, 200);
  })
  .openapi(createProjectRoute, async (c) => {
    const { name, icon, slug, accessMode } = c.req.valid("json");
    const workspaceId = c.get("workspaceId");
    if (accessMode === "workspace" && !(await canManageProjectAccess(c)))
      throw new HTTPException(403, { message: "Insufficient permissions" });
    const newProject = await createProjectCtrl(
      workspaceId,
      name,
      icon,
      slug,
      c.get("userId"),
      accessMode,
    );
    return c.json(newProject, 200);
  })
  .openapi(getProjectRoute, async (c) => {
    const { id } = c.req.valid("param");
    const workspaceId = c.get("workspaceId");
    const projectData = await getProjectCtrl(id, workspaceId);
    return c.json(projectData, 200);
  })
  .openapi(listProjectFilesRoute, async (c) => {
    const { projectId } = c.req.valid("param");
    const { q, kind, uploadedBy, sort, page, limit } = c.req.valid("query");
    const files = await getProjectFilesCtrl({
      projectId,
      apiBaseUrl: normalizeApiServerUrl(
        process.env.MAKI_API_URL || new URL(c.req.url).origin,
      ),
      q: q?.trim() || undefined,
      kind,
      uploadedBy,
      sort,
      page,
      limit,
    });
    return c.json(files, 200);
  })
  .openapi(reorderProjectsRoute, async (c) => {
    const workspaceId = c.get("workspaceId");
    const { projects } = c.req.valid("json");
    for (const project of projects)
      await assertProjectAccess(c.get("userId"), project.id);
    const reordered = await reorderProjectsCtrl(
      workspaceId,
      projects,
      c.get("userId"),
    );
    return c.json(reordered, 200);
  })
  .openapi(updateProjectRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { name, icon, slug, description, isPublic, accessMode } =
      c.req.valid("json");
    const workspaceId = c.get("workspaceId");
    const updatedProject = await updateProjectCtrl(
      id,
      name,
      icon,
      slug,
      description,
      isPublic,
      workspaceId,
      accessMode,
    );
    await publishEvent("project.access.changed", { workspaceId });
    return c.json(updatedProject, 200);
  })
  .openapi(deleteProjectRoute, async (c) => {
    const { id } = c.req.valid("param");
    const workspaceId = c.get("workspaceId");
    const deletedProject = await deleteProjectCtrl(id, workspaceId);
    return c.json(deletedProject, 200);
  })
  .openapi(archiveProjectRoute, async (c) => {
    const { id } = c.req.valid("param");
    const workspaceId = c.get("workspaceId");
    const archivedProject = await archiveProjectCtrl(id, workspaceId);
    return c.json(archivedProject, 200);
  })
  .openapi(unarchiveProjectRoute, async (c) => {
    const { id } = c.req.valid("param");
    const workspaceId = c.get("workspaceId");
    const unarchivedProject = await unarchiveProjectCtrl(id, workspaceId);
    return c.json(unarchivedProject, 200);
  });

export default project;
