import { and, asc, eq, exists, isNull, lt, sql } from "drizzle-orm";
import db from "../../database";
import { columnTable, projectTable, taskTable } from "../../database/schema";

type WorkspaceTaskScope = "mine" | "all";

type GetWorkspaceTasksOptions = {
  scope: WorkspaceTaskScope;
  limit: number;
};

/**
 * The dashboard work queue: the caller's open tasks, or every open task in the
 * workspace, ranked overdue first. Bounded rows, uncapped total — never load
 * every board to render the workspace home.
 *
 * `userId` is the authenticated caller, never client input, so `mine` cannot be
 * pointed at another member's queue.
 */
export default async function getWorkspaceTasks(
  workspaceId: string,
  userId: string,
  { scope, limit }: GetWorkspaceTasksOptions,
  now = new Date(),
) {
  const openColumn = db
    .select({ id: columnTable.id })
    .from(columnTable)
    .where(
      and(
        eq(columnTable.projectId, taskTable.projectId),
        eq(columnTable.slug, taskTable.status),
        eq(columnTable.isFinal, false),
      ),
    );
  // Match project statistics: planned/archived buckets have no board column.
  const scopeCondition = and(
    eq(projectTable.workspaceId, workspaceId),
    isNull(projectTable.archivedAt),
    exists(openColumn),
    scope === "mine" ? eq(taskTable.userId, userId) : undefined,
  );

  const overdue = lt(taskTable.dueDate, now);
  // Undated work ranks last: it is not late, but it is also not scheduled.
  const dueDateBucket = sql<number>`case when ${overdue} then 0 when ${taskTable.dueDate} is null then 2 else 1 end`;
  const priorityRank = sql<number>`case ${taskTable.priority} when 'urgent' then 0 when 'high' then 1 when 'medium' then 2 when 'low' then 3 else 4 end`;
  const fields = {
    id: taskTable.id,
    title: taskTable.title,
    number: taskTable.number,
    projectId: projectTable.id,
    projectName: projectTable.name,
    projectSlug: projectTable.slug,
    status: taskTable.status,
    statusName: sql<string>`(select ${columnTable.name} from ${columnTable} where ${columnTable.projectId} = ${taskTable.projectId} and ${columnTable.slug} = ${taskTable.status} and ${columnTable.isFinal} is false order by ${columnTable.id} limit 1)`,
    priority: taskTable.priority,
    dueDate: taskTable.dueDate,
  };
  const [tasks, counts] = await Promise.all([
    db
      .select(fields)
      .from(taskTable)
      .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
      .where(scopeCondition)
      .orderBy(
        dueDateBucket,
        // ASC puts NULL last in Postgres, which is where undated work belongs.
        asc(taskTable.dueDate),
        priorityRank,
        asc(taskTable.id),
      )
      .limit(limit),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(taskTable)
      .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
      .where(scopeCondition),
  ]);

  return {
    scope,
    total: counts[0]?.total ?? 0,
    tasks,
  };
}
