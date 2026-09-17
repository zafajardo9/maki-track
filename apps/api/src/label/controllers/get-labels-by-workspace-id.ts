import { and, eq, isNull } from "drizzle-orm";
import db from "../../database";
import { labelTable } from "../../database/schema";

function getLabelsByWorkspaceId(workspaceId: string) {
  return db
    .select()
    .from(labelTable)
    .where(
      and(
        eq(labelTable.workspaceId, workspaceId),
        isNull(labelTable.projectId),
      ),
    );
}

export default getLabelsByWorkspaceId;
