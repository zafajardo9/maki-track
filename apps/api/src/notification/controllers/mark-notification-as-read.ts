import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { notificationTable } from "../../database/schema";
import {
  assertProjectAccess,
  assertTaskAccess,
} from "../../utils/project-access";

async function markNotificationAsRead(id: string, userId: string) {
  const [existing] = await db
    .select()
    .from(notificationTable)
    .where(
      and(eq(notificationTable.id, id), eq(notificationTable.userId, userId)),
    );
  if (existing?.resourceId) {
    if (existing.resourceType === "task")
      await assertTaskAccess(userId, existing.resourceId);
    if (existing.resourceType === "project")
      await assertProjectAccess(userId, existing.resourceId);
  }
  const [notification] = await db
    .update(notificationTable)
    .set({ isRead: true })
    .where(
      and(eq(notificationTable.id, id), eq(notificationTable.userId, userId)),
    )
    .returning();

  if (!notification) {
    throw new HTTPException(404, {
      message: "Notification not found",
    });
  }

  return notification;
}

export default markNotificationAsRead;
