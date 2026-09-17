import { eq } from "drizzle-orm";
import db from "../../database";
import { labelTable } from "../../database/schema";

function getTagsByProjectId(projectId: string) {
  return db
    .select()
    .from(labelTable)
    .where(eq(labelTable.projectId, projectId));
}

export default getTagsByProjectId;
