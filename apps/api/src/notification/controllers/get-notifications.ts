import { and, desc, eq, isNull, notInArray, or } from "drizzle-orm";
import db from "../../database";
import {
  notificationTable,
  projectTable,
  taskTable,
  workspaceTable,
} from "../../database/schema";
import { projectAccessCondition } from "../../utils/project-access";

async function getNotifications(userId: string) {
  const rows = await db
    .select({
      notification: notificationTable,
      projectId: projectTable.id,
      workspaceId: workspaceTable.id,
    })
    .from(notificationTable)
    .leftJoin(
      taskTable,
      and(
        eq(notificationTable.resourceId, taskTable.id),
        eq(notificationTable.resourceType, "task"),
      ),
    )
    .leftJoin(
      projectTable,
      or(
        eq(taskTable.projectId, projectTable.id),
        and(
          eq(notificationTable.resourceType, "project"),
          eq(notificationTable.resourceId, projectTable.id),
        ),
      ),
    )
    .leftJoin(workspaceTable, eq(projectTable.workspaceId, workspaceTable.id))
    .where(
      and(
        eq(notificationTable.userId, userId),
        or(
          isNull(notificationTable.resourceType),
          notInArray(notificationTable.resourceType, ["task", "project"]),
          await projectAccessCondition(userId),
        ),
      ),
    )
    .orderBy(desc(notificationTable.createdAt))
    .limit(50);

  return rows.map(({ notification, projectId, workspaceId }) => {
    if (!projectId && !workspaceId) {
      return notification;
    }

    const existing =
      notification.eventData &&
      typeof notification.eventData === "object" &&
      !Array.isArray(notification.eventData)
        ? (notification.eventData as Record<string, unknown>)
        : {};

    return {
      ...notification,
      eventData: {
        ...existing,
        projectId: projectId ?? existing.projectId ?? null,
        workspaceId: workspaceId ?? existing.workspaceId ?? null,
      },
    };
  });
}

export default getNotifications;
