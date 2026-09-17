import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { labelTable, projectTable, taskTable } from "../../database/schema";
import { publishEvent } from "../../events";

async function unassignTagFromTask(id: string, userId: string) {
  const tag = await db.query.labelTable.findFirst({
    where: (label, { eq }) => eq(label.id, id),
  });

  if (!tag) {
    throw new HTTPException(404, {
      message: "Tag not found",
    });
  }

  if (!tag.projectId) {
    throw new HTTPException(400, {
      message: "Not a project tag",
    });
  }

  if (!tag.taskId) {
    throw new HTTPException(400, {
      message: "Tag is not assigned to a task",
    });
  }

  const [task] = await db
    .select({
      id: taskTable.id,
      projectId: taskTable.projectId,
      workspaceId: projectTable.workspaceId,
    })
    .from(taskTable)
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .where(eq(taskTable.id, tag.taskId))
    .limit(1);

  if (!task) {
    throw new HTTPException(404, {
      message: "Task not found",
    });
  }

  const [deletedTag] = await db
    .delete(labelTable)
    .where(eq(labelTable.id, id))
    .returning();

  if (!deletedTag) {
    throw new HTTPException(500, {
      message: "Failed to detach tag from task",
    });
  }

  // Tags never sync to GitHub/Gitea.
  await publishEvent("task.label_unassigned", {
    label: deletedTag,
    task,
    projectId: task.projectId,
    taskId: deletedTag.taskId,
    userId,
    type: "label_unassigned",
  });

  return deletedTag;
}

export default unassignTagFromTask;
