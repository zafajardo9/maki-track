import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { publishEvent } from "../../events";
import deleteLabel from "../../label/controllers/delete-label";

async function deleteTag(id: string, userId: string) {
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

  // deleteLabel derives the cascade scope from the row itself, so only this
  // tag's copies inside its project are removed.
  const result = await deleteLabel(id, userId, "tag");
  await publishEvent("project.tags_changed", { projectId: tag.projectId });
  return result;
}

export default deleteTag;
