import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { labelTable } from "../../database/schema";

async function updateLabel(
  id: string,
  name: string,
  color: string,
  scope: "label" | "tag" = "label",
) {
  try {
    return await db.transaction(async (tx) => {
      const label = await tx.query.labelTable.findFirst({
        where: (label, { eq }) => eq(label.id, id),
      });

      if (!label) {
        throw new HTTPException(404, {
          message: "Label not found",
        });
      }

      if (Boolean(label.projectId) !== (scope === "tag")) {
        throw new HTTPException(400, { message: "Not a workspace label" });
      }

      const [updatedLabel] = await tx
        .update(labelTable)
        .set({ name, color })
        .where(eq(labelTable.id, id))
        .returning();

      // If this is a palette row, cascade the changes to its task-level copies
      // so existing assignments reflect the new color/name. The cascade must
      // stay within the row's scope: a workspace label's copies all have a NULL
      // project_id, a tag's copies all share its project_id. Renaming one scope
      // must never touch rows that merely share the name in the other scope.
      if (!label.taskId && label.workspaceId) {
        await tx
          .update(labelTable)
          .set({ name, color })
          .where(
            and(
              eq(labelTable.workspaceId, label.workspaceId),
              eq(labelTable.name, label.name),
              isNotNull(labelTable.taskId),
              label.projectId
                ? eq(labelTable.projectId, label.projectId)
                : isNull(labelTable.projectId),
            ),
          );
      }

      return updatedLabel;
    });
  } catch (error) {
    // Drizzle wraps PostgreSQL errors in `cause`. Keep unexpected failures
    // intact, but report a name collision as a client-visible conflict.
    const cause = error instanceof Error && error.cause ? error.cause : error;
    if (
      typeof cause === "object" &&
      cause !== null &&
      "code" in cause &&
      cause.code === "23505"
    ) {
      throw new HTTPException(409, {
        message: "A label or tag with this name already exists in this scope",
      });
    }
    throw error;
  }
}

export default updateLabel;
