import { and, eq, isNull, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { labelTable, projectTable } from "../../database/schema";
import { publishEvent } from "../../events";

async function createTag(name: string, color: string, projectId: string) {
  const [project] = await db
    .select({
      id: projectTable.id,
      workspaceId: projectTable.workspaceId,
    })
    .from(projectTable)
    .where(eq(projectTable.id, projectId))
    .limit(1);

  if (!project) {
    throw new HTTPException(404, {
      message: "Project not found",
    });
  }

  const [inserted] = await db
    .insert(labelTable)
    .values({
      name,
      color,
      taskId: null,
      workspaceId: project.workspaceId,
      projectId,
    })
    .onConflictDoNothing({
      target: [labelTable.projectId, labelTable.name],
      where: sql`${labelTable.taskId} is null and ${labelTable.projectId} is not null`,
    })
    .returning();

  const tag =
    inserted ??
    (await db.query.labelTable.findFirst({
      where: and(
        eq(labelTable.projectId, projectId),
        eq(labelTable.name, name),
        isNull(labelTable.taskId),
      ),
    }));

  if (!tag) {
    throw new Error("Failed to create or resolve tag");
  }

  if (inserted) {
    await publishEvent("project.tags_changed", { projectId });
  }

  return tag;
}

export default createTag;
