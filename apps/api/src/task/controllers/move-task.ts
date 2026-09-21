import { and, asc, eq, max } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import {
  activityTable,
  assetTable,
  columnTable,
  labelTable,
  projectTable,
  taskTable,
} from "../../database/schema";
import { publishEvent } from "../../events";
import { assertProjectAccess } from "../../utils/project-access";
import { claimTaskNumber } from "./claim-task-numbers";

type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

function isSameProjectMove(
  sourceProjectId: string,
  destinationProjectId: string,
) {
  return sourceProjectId === destinationProjectId;
}

async function resolveDestinationStatus(
  destinationProjectId: string,
  currentStatus: string,
  requestedStatus?: string,
) {
  const destinationColumns = await db
    .select({
      id: columnTable.id,
      slug: columnTable.slug,
      position: columnTable.position,
    })
    .from(columnTable)
    .where(eq(columnTable.projectId, destinationProjectId))
    .orderBy(asc(columnTable.position));

  const [firstColumn] = destinationColumns;

  if (!firstColumn) {
    throw new HTTPException(400, {
      message: "Destination project does not have a workflow",
    });
  }

  const requestedColumn = requestedStatus
    ? destinationColumns.find((column) => column.slug === requestedStatus)
    : null;

  if (requestedStatus && !requestedColumn) {
    throw new HTTPException(400, {
      message: "Selected status is not valid for the destination project",
    });
  }

  const matchingCurrentColumn = destinationColumns.find(
    (column) => column.slug === currentStatus,
  );

  return requestedColumn ?? matchingCurrentColumn ?? firstColumn;
}

async function getNextTaskPosition(
  dbOrTx: DbOrTx,
  projectId: string,
  status: string,
  columnId: string,
) {
  const [maxPositionResult] = await dbOrTx
    .select({ maxPosition: max(taskTable.position) })
    .from(taskTable)
    .where(
      and(
        eq(taskTable.projectId, projectId),
        eq(taskTable.status, status),
        eq(taskTable.columnId, columnId),
      ),
    );

  return (maxPositionResult?.maxPosition ?? 0) + 1;
}

async function moveTask({
  taskId,
  destinationProjectId,
  destinationStatus,
  currentUserId,
}: {
  taskId: string;
  destinationProjectId: string;
  destinationStatus?: string;
  currentUserId: string;
}) {
  await assertProjectAccess(currentUserId, destinationProjectId);
  const existingTask = await db.query.taskTable.findFirst({
    where: eq(taskTable.id, taskId),
  });

  if (!existingTask) {
    throw new HTTPException(404, {
      message: "Task not found",
    });
  }

  if (isSameProjectMove(existingTask.projectId, destinationProjectId)) {
    throw new HTTPException(400, {
      message: "Task is already in that project",
    });
  }

  const [sourceProject, destinationProject] = await Promise.all([
    db.query.projectTable.findFirst({
      where: eq(projectTable.id, existingTask.projectId),
    }),
    db.query.projectTable.findFirst({
      where: eq(projectTable.id, destinationProjectId),
    }),
  ]);

  if (!sourceProject || !destinationProject) {
    throw new HTTPException(404, {
      message: "Project not found",
    });
  }

  if (sourceProject.workspaceId !== destinationProject.workspaceId) {
    throw new HTTPException(400, {
      message: "Tasks can only be moved within the same workspace",
    });
  }

  const resolvedColumn = await resolveDestinationStatus(
    destinationProjectId,
    existingTask.status,
    destinationStatus,
  );

  const movedTask = await db.transaction(async (tx) => {
    const [nextTaskNumber, nextPosition] = await Promise.all([
      claimTaskNumber(destinationProjectId, tx),
      getNextTaskPosition(
        tx,
        destinationProjectId,
        resolvedColumn.slug,
        resolvedColumn.id,
      ),
    ]);

    const [updatedTask] = await tx
      .update(taskTable)
      .set({
        projectId: destinationProjectId,
        status: resolvedColumn.slug,
        columnId: resolvedColumn.id,
        number: nextTaskNumber,
        position: nextPosition,
      })
      .where(
        and(
          eq(taskTable.id, taskId),
          eq(taskTable.projectId, existingTask.projectId),
        ),
      )
      .returning();

    if (!updatedTask) {
      throw new HTTPException(409, {
        message: "Task moved concurrently; reload it and try again",
      });
    }

    await tx
      .update(assetTable)
      .set({ projectId: destinationProjectId })
      .where(eq(assetTable.taskId, taskId));

    // Project tags do not follow a task across projects: strip the task's
    // tag copies (project_id set) from the source project. Workspace label
    // copies (project_id NULL) stay attached.
    const strippedTagCopies = await tx
      .select()
      .from(labelTable)
      .where(
        and(
          eq(labelTable.taskId, taskId),
          eq(labelTable.projectId, existingTask.projectId),
        ),
      );

    if (strippedTagCopies.length > 0) {
      await tx
        .delete(labelTable)
        .where(
          and(
            eq(labelTable.taskId, taskId),
            eq(labelTable.projectId, existingTask.projectId),
          ),
        );
    }

    if (strippedTagCopies.length > 0) {
      await tx.insert(activityTable).values(
        strippedTagCopies.map((tagCopy) => ({
          taskId,
          type: "label_unassigned",
          userId: currentUserId,
          content: null,
          eventData: {
            labelName: tagCopy.name,
            labelColor: tagCopy.color,
            fromProjectId: sourceProject.id,
          },
        })),
      );
    }
    return { task: updatedTask, strippedTagCopies };
  });

  await publishEvent("task.moved", {
    taskId,
    type: "moved",
    userId: currentUserId,
    fromProjectId: sourceProject.id,
    fromProjectName: sourceProject.name,
    toProjectId: destinationProject.id,
    toProjectName: destinationProject.name,
    oldStatus: existingTask.status,
    newStatus: resolvedColumn.slug,
  });

  return {
    task: movedTask.task,
    sourceProjectId: sourceProject.id,
    destinationProjectId: destinationProject.id,
  };
}

export default moveTask;
