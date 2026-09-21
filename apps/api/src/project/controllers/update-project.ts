import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { projectTable } from "../../database/schema";

async function updateProject(
  id: string,
  name: string,
  icon: string,
  slug: string,
  description: string,
  isPublic: boolean,
  workspaceId: string,
  accessMode?: "workspace" | "restricted",
) {
  return db.transaction(async (tx) => {
    const [existingProject] = await tx
      .select()
      .from(projectTable)
      .where(
        and(eq(projectTable.id, id), eq(projectTable.workspaceId, workspaceId)),
      )
      .for("update");

    if (!existingProject) {
      throw new HTTPException(404, {
        message:
          "Project doesn't exist or doesn't belong to the specified workspace",
      });
    }

    const nextAccessMode = accessMode ?? existingProject.accessMode;
    const restricting =
      accessMode === "restricted" &&
      existingProject.accessMode !== "restricted";
    if (nextAccessMode === "restricted" && isPublic && !restricting) {
      throw new HTTPException(400, {
        message: "Restricted projects cannot be public",
      });
    }
    const [updatedWorkspace] = await tx
      .update(projectTable)
      .set({
        name,
        icon,
        slug,
        description,
        accessMode: nextAccessMode,
        isPublic: nextAccessMode === "restricted" ? false : isPublic,
      })
      .where(eq(projectTable.id, id))
      .returning();

    return updatedWorkspace;
  });
}

export default updateProject;
