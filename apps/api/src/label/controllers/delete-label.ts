import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { labelTable, projectTable, taskTable } from "../../database/schema";
import { publishEvent } from "../../events";
import { removeLabelFromGitea } from "../../plugins/gitea/utils/sync-label-to-gitea";
import { removeLabelFromGitHub } from "../../plugins/github/utils/sync-label-to-github";

async function deleteLabel(
  id: string,
  userId: string,
  scope: "label" | "tag" = "label",
) {
  const { deletedLabel, affectedLabels } = await db.transaction(async (tx) => {
    const label = await tx.query.labelTable.findFirst({
      where: eq(labelTable.id, id),
    });
    if (!label) throw new HTTPException(404, { message: "Label not found" });
    if (Boolean(label.projectId) !== (scope === "tag")) {
      throw new HTTPException(400, {
        message:
          scope === "tag" ? "Not a project tag" : "Not a workspace label",
      });
    }

    const [deletedLabel] = await tx
      .delete(labelTable)
      .where(eq(labelTable.id, id))
      .returning();
    if (!deletedLabel)
      throw new HTTPException(404, { message: "Label not found" });

    if (deletedLabel.taskId) {
      const [task] = await tx
        .select({ id: taskTable.id, projectId: taskTable.projectId })
        .from(taskTable)
        .where(eq(taskTable.id, deletedLabel.taskId));
      if (!task) throw new HTTPException(404, { message: "Task not found" });
      return {
        deletedLabel,
        affectedLabels: [
          { label: deletedLabel, taskId: task.id, projectId: task.projectId },
        ],
      };
    }
    if (!deletedLabel.workspaceId) return { deletedLabel, affectedLabels: [] };

    // Use the row returned by DELETE: a concurrent rename may have committed
    // since the initial read. Both the palette and its copies commit together.
    const copies = and(
      eq(labelTable.workspaceId, deletedLabel.workspaceId),
      eq(labelTable.name, deletedLabel.name),
      isNotNull(labelTable.taskId),
      deletedLabel.projectId
        ? eq(labelTable.projectId, deletedLabel.projectId)
        : isNull(labelTable.projectId),
    );
    const affectedLabels = await tx
      .select({
        label: labelTable,
        taskId: taskTable.id,
        projectId: projectTable.id,
      })
      .from(labelTable)
      .innerJoin(taskTable, eq(labelTable.taskId, taskTable.id))
      .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
      .where(copies);
    await tx.delete(labelTable).where(copies);
    return { deletedLabel, affectedLabels };
  });

  // Publish and sync only after the transaction commits; rolled-back deletions
  // must not remove provider labels or invalidate other clients' state.
  for (const { label, taskId, projectId } of affectedLabels) {
    if (label.projectId === null) {
      removeLabelFromGitHub(taskId, label.name).catch((error) =>
        console.error("Failed to remove label from GitHub:", error),
      );
      removeLabelFromGitea(taskId, label.name).catch((error) =>
        console.error("Failed to remove label from Gitea:", error),
      );
    }
    await publishEvent("task.label_deleted", {
      label,
      task: { id: taskId, projectId },
      projectId,
      taskId,
      userId,
      type: "label_deleted",
    });
  }
  return deletedLabel;
}

export default deleteLabel;
