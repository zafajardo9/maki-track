import { and, eq, inArray, or, type SQL, sql } from "drizzle-orm";
import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import db from "../database";
import {
  projectMemberTable,
  projectTable,
  taskTable,
  userTable,
  workspaceRoleTable,
  workspaceUserTable,
} from "../database/schema";
import { hasWorkspacePermission } from "./require-workspace-permission";

export type ProjectAccessMode = "workspace" | "restricted";

// Resolve editable role JSON in code, using the same fail-closed parsing as
// workspace permissions. SQL filters apply before limits and aggregates.
export async function projectAccessCondition(userId: string): Promise<SQL> {
  if (!userId) return sql`false`;
  const [user] = await db
    .select({ role: userTable.role })
    .from(userTable)
    .where(eq(userTable.id, userId));
  if (user?.role === "admin") return sql`true`;
  const memberships = await db
    .select({
      workspaceId: workspaceUserTable.workspaceId,
      role: workspaceUserTable.role,
      permission: workspaceRoleTable.permission,
    })
    .from(workspaceUserTable)
    .leftJoin(
      workspaceRoleTable,
      and(
        eq(workspaceRoleTable.workspaceId, workspaceUserTable.workspaceId),
        eq(workspaceRoleTable.role, workspaceUserTable.role),
      ),
    )
    .where(eq(workspaceUserTable.userId, userId));
  const allProjects = memberships
    .filter((member) => {
      if (member.role === "owner" || member.role === "admin") return true;
      try {
        const actions: unknown = JSON.parse(member.permission ?? "{}").project;
        return Array.isArray(actions) && actions.includes("access_all");
      } catch {
        return false;
      }
    })
    .map((member) => member.workspaceId);
  return (or(
    allProjects.length
      ? inArray(projectTable.workspaceId, allProjects)
      : sql`false`,
    and(
      memberships.length
        ? inArray(
            projectTable.workspaceId,
            memberships.map((member) => member.workspaceId),
          )
        : sql`false`,
      or(
        eq(projectTable.accessMode, "workspace"),
        sql`exists (
        select 1 from ${projectMemberTable} pm
        join ${workspaceUserTable} wm on wm.id = pm.workspace_member_id
        where pm.project_id = ${projectTable.id} and wm.user_id = ${userId}
      )`,
      ),
    ),
  ) ?? sql`false`);
}

export async function canAccessProject(userId: string, projectId: string) {
  const [row] = await db
    .select({ id: projectTable.id })
    .from(projectTable)
    .where(
      and(eq(projectTable.id, projectId), await projectAccessCondition(userId)),
    )
    .limit(1);
  return Boolean(row);
}

export async function assertProjectAccess(userId: string, projectId: string) {
  if (!(await canAccessProject(userId, projectId)))
    throw new HTTPException(404, { message: "Project not found" });
}

export async function assertTaskAccess(userId: string, taskId: string) {
  const [task] = await db
    .select({ projectId: taskTable.projectId })
    .from(taskTable)
    .where(eq(taskTable.id, taskId));
  if (!task) throw new HTTPException(404, { message: "Task not found" });
  await assertProjectAccess(userId, task.projectId);
}

export async function canManageProjectAccess(c: Context) {
  const scopes = c.get("apiKey")?.permissions as
    | Record<string, string[]>
    | undefined;
  if (scopes && !scopes.project?.includes("manage_access")) return false;
  const [member] = await db
    .select({ role: workspaceUserTable.role })
    .from(workspaceUserTable)
    .where(
      and(
        eq(workspaceUserTable.workspaceId, c.get("workspaceId")),
        eq(workspaceUserTable.userId, c.get("userId")),
      ),
    );
  return (
    member?.role === "owner" ||
    member?.role === "admin" ||
    (await hasWorkspacePermission(c, { project: ["manage_access"] }))
  );
}

export async function requireProjectAccessManagement(c: Context, next: Next) {
  if (!(await canManageProjectAccess(c)))
    throw new HTTPException(403, { message: "Insufficient permissions" });
  return next();
}
