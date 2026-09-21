import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import {
  projectMemberTable,
  projectTable,
  userTable,
  workspaceUserTable,
} from "../../database/schema";
import { publishEvent } from "../../events";
import type { ProjectAccessMode } from "../../utils/project-access";

export async function getProjectMembers(
  projectId: string,
  workspaceId: string,
) {
  const members = await db
    .select({
      userId: userTable.id,
      name: userTable.name,
      email: userTable.email,
      role: workspaceUserTable.role,
      membershipId: projectMemberTable.id,
    })
    .from(workspaceUserTable)
    .innerJoin(userTable, eq(userTable.id, workspaceUserTable.userId))
    .leftJoin(
      projectMemberTable,
      and(
        eq(projectMemberTable.workspaceMemberId, workspaceUserTable.id),
        eq(projectMemberTable.projectId, projectId),
      ),
    )
    .where(eq(workspaceUserTable.workspaceId, workspaceId));
  return members
    .filter(
      (member) =>
        member.membershipId ||
        member.role === "owner" ||
        member.role === "admin",
    )
    .map(({ membershipId, ...member }) => ({
      ...member,
      explicit: Boolean(membershipId),
      inherited: member.role === "owner" || member.role === "admin",
    }));
}

export async function setProjectMember(
  projectId: string,
  workspaceId: string,
  userId: string,
  present: boolean,
) {
  await db.transaction(async (tx) => {
    const [member] = await tx
      .select()
      .from(workspaceUserTable)
      .where(
        and(
          eq(workspaceUserTable.workspaceId, workspaceId),
          eq(workspaceUserTable.userId, userId),
        ),
      )
      .for("update");
    if (!member) {
      if (!present) return;
      throw new HTTPException(400, {
        message: "User must belong to this workspace",
      });
    }
    if (present)
      await tx
        .insert(projectMemberTable)
        .values({ projectId, workspaceId, workspaceMemberId: member.id })
        .onConflictDoNothing();
    else
      await tx
        .delete(projectMemberTable)
        .where(
          and(
            eq(projectMemberTable.projectId, projectId),
            eq(projectMemberTable.workspaceMemberId, member.id),
          ),
        );
  });
  await publishEvent("project.access.changed", { workspaceId });
}

export async function setProjectAccessMode(
  projectId: string,
  workspaceId: string,
  accessMode: ProjectAccessMode,
) {
  const [project] = await db
    .update(projectTable)
    .set({
      accessMode,
      ...(accessMode === "restricted" ? { isPublic: false } : {}),
    })
    .where(
      and(
        eq(projectTable.id, projectId),
        eq(projectTable.workspaceId, workspaceId),
      ),
    )
    .returning();
  if (!project) throw new HTTPException(404, { message: "Project not found" });
  await publishEvent("project.access.changed", { workspaceId });
  return project;
}
