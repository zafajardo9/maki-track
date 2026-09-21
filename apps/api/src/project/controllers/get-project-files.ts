import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import db from "../../database";
import { assetTable, taskTable, userTable } from "../../database/schema";
import { escapeLikePattern } from "../../search/like-pattern";

type ProjectFileKind = "all" | "image" | "attachment";
type ProjectFileSort = "newest" | "oldest" | "name" | "largest";

type ProjectFilesOptions = {
  projectId: string;
  apiBaseUrl: string;
  q?: string;
  kind?: ProjectFileKind;
  uploadedBy?: string;
  sort?: ProjectFileSort;
  page?: number;
  limit?: number;
};

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 100;

async function getProjectFiles(options: ProjectFilesOptions) {
  const { projectId, apiBaseUrl, q, uploadedBy } = options;
  const kind = options.kind ?? "all";
  const sort = options.sort ?? "newest";

  const page = options.page && options.page > 0 ? options.page : 1;
  const pageSize = Math.min(options.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const offset = (page - 1) * pageSize;

  const conditions = [eq(assetTable.projectId, projectId)];
  if (kind !== "all") {
    conditions.push(eq(assetTable.kind, kind));
  }
  if (uploadedBy) {
    conditions.push(eq(assetTable.createdBy, uploadedBy));
  }

  // `ilike` reads `%` and `_` as wildcards, so a filename typed literally has to
  // be escaped or it matches rows the caller never asked for.
  const searchPattern = q ? `%${escapeLikePattern(q.toLowerCase())}%` : null;

  // A file is searchable by its own name, by the task it came from, and by who
  // sent it -- those are the three things people remember about a document.
  const searchCondition = searchPattern
    ? or(
        ilike(assetTable.filename, searchPattern),
        ilike(taskTable.title, searchPattern),
        ilike(userTable.name, searchPattern),
      )
    : undefined;

  const whereClause = and(...conditions, searchCondition);

  const relevance = searchPattern
    ? sql<number>`CASE
        WHEN LOWER(${assetTable.filename}) LIKE ${searchPattern} THEN 3
        WHEN LOWER(${taskTable.title}) LIKE ${searchPattern} THEN 2
        ELSE 1
      END`
    : null;

  // The joins exist for the filters and the returned names, so they are present
  // on the count too; without them a `q` that only matches a task title would
  // report a total that does not match the rows returned.
  const [summary] = await db
    .select({
      total: sql<number>`count(*)`,
      totalSize: sql<number>`coalesce(sum(${assetTable.size}), 0)`,
    })
    .from(assetTable)
    .leftJoin(taskTable, eq(assetTable.taskId, taskTable.id))
    .leftJoin(userTable, eq(assetTable.createdBy, userTable.id))
    .where(whereClause);

  const total = Number(summary?.total ?? 0);
  const totalSize = Number(summary?.totalSize ?? 0);

  const orderByClause = relevance
    ? [desc(relevance), desc(assetTable.createdAt)]
    : sort === "oldest"
      ? [asc(assetTable.createdAt)]
      : sort === "name"
        ? [asc(assetTable.filename)]
        : sort === "largest"
          ? [desc(assetTable.size)]
          : [desc(assetTable.createdAt)];

  const rows = await db
    .select({
      id: assetTable.id,
      filename: assetTable.filename,
      mimeType: assetTable.mimeType,
      size: assetTable.size,
      kind: assetTable.kind,
      surface: assetTable.surface,
      activityId: assetTable.activityId,
      createdAt: assetTable.createdAt,
      taskId: taskTable.id,
      taskNumber: taskTable.number,
      taskTitle: taskTable.title,
      uploaderId: userTable.id,
      uploaderName: userTable.name,
      uploaderEmail: userTable.email,
      uploaderImage: userTable.image,
    })
    .from(assetTable)
    .leftJoin(taskTable, eq(assetTable.taskId, taskTable.id))
    .leftJoin(userTable, eq(assetTable.createdBy, userTable.id))
    .where(whereClause)
    .orderBy(...orderByClause)
    .limit(pageSize)
    .offset(offset);

  return {
    data: rows.map((row) => ({
      id: row.id,
      filename: row.filename,
      mimeType: row.mimeType,
      size: row.size,
      // `kind` and `surface` are plain text columns, so anything unrecognised is
      // folded into the safe default rather than leaking an unknown value into
      // the typed response.
      kind: row.kind === "image" ? ("image" as const) : ("attachment" as const),
      surface:
        row.surface === "comment"
          ? ("comment" as const)
          : ("description" as const),
      url: `${apiBaseUrl}/asset/${row.id}`,
      createdAt: row.createdAt,
      task:
        row.taskId && row.taskTitle !== null && row.taskNumber !== null
          ? {
              id: row.taskId,
              number: row.taskNumber,
              title: row.taskTitle,
            }
          : null,
      activityId: row.activityId,
      uploadedBy: row.uploaderId
        ? {
            id: row.uploaderId,
            name: row.uploaderName,
            email: row.uploaderEmail ?? "",
            image: row.uploaderImage,
          }
        : null,
    })),
    pagination: {
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
    totalSize,
  };
}

export default getProjectFiles;
