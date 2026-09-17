import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { publishEvent } from "../../events";
import updateLabel from "../../label/controllers/update-label";

async function updateTag(id: string, name: string, color: string) {
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

  // updateLabel derives the cascade scope from the row itself, so the rename
  // propagates to this tag's copies within its project only.
  const result = await updateLabel(id, name, color, "tag");
  await publishEvent("project.tags_changed", { projectId: tag.projectId });
  return result;
}

export default updateTag;
