import { and, eq, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { labelTable, projectTable, taskTable } from "../../database/schema";
import { publishEvent } from "../../events";

async function assignTagToTask(id: string, taskId: string, userId: string) {
  const { task, taskTag, inserted } = await db.transaction(async (tx) => {
    // Moves update this row too. Lock before checking the project so an attach
    // cannot insert a source-project tag after a move has already stripped it.
    const [lockedTask] = await tx
      .select({ id: taskTable.id, projectId: taskTable.projectId })
      .from(taskTable)
      .where(eq(taskTable.id, taskId))
      .for("update");
    if (!lockedTask) {
      throw new HTTPException(404, { message: "Task not found" });
    }
    const project = await tx.query.projectTable.findFirst({
      where: eq(projectTable.id, lockedTask.projectId),
    });
    if (!project) {
      throw new HTTPException(404, { message: "Project not found" });
    }
    const task = { ...lockedTask, workspaceId: project.workspaceId };

    // Keep the source row stable until its copy is committed, including when
    // another request renames or deletes the palette entry.
    const [tag] = await tx
      .select()
      .from(labelTable)
      .where(eq(labelTable.id, id))
      .for("share");
    if (!tag) {
      throw new HTTPException(404, { message: "Tag not found" });
    }
    if (!tag.projectId) {
      throw new HTTPException(400, { message: "Not a project tag" });
    }
    if (
      tag.projectId !== task.projectId ||
      tag.workspaceId !== task.workspaceId
    ) {
      throw new HTTPException(400, {
        message: "Tag and task must belong to the same project",
      });
    }
    if (tag.taskId === taskId) return { task, taskTag: tag, inserted: false };

    // Attaching copies the source, even if the caller supplied an assigned row.
    // It must never silently detach that row from a different task.
    const [copy] = await tx
      .insert(labelTable)
      .values({
        name: tag.name,
        color: tag.color,
        taskId,
        workspaceId: task.workspaceId,
        projectId: task.projectId,
      })
      .onConflictDoNothing({
        target: [labelTable.taskId, labelTable.name],
        where: sql`${labelTable.projectId} is not null`,
      })
      .returning();
    if (copy) return { task, taskTag: copy, inserted: true };

    const existing = await tx.query.labelTable.findFirst({
      where: and(
        eq(labelTable.taskId, taskId),
        eq(labelTable.name, tag.name),
        eq(labelTable.projectId, task.projectId),
      ),
    });
    if (!existing)
      throw new HTTPException(500, { message: "Failed to attach tag to task" });
    return { task, taskTag: existing, inserted: false };
  });

  if (inserted) {
    await publishEvent("task.label_assigned", {
      label: taskTag,
      task,
      projectId: task.projectId,
      taskId: task.id,
      userId,
      type: "label_assigned",
    });
  }
  return taskTag;
}

export default assignTagToTask;
