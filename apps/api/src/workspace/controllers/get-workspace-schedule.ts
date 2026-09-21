import { and, asc, eq, exists, gte, isNull, lt, sql } from "drizzle-orm";
import db from "../../database";
import { columnTable, projectTable, taskTable } from "../../database/schema";
import { projectAccessCondition } from "../../utils/project-access";

/** Bounded deadline lists; never load every board to render the workspace home. */
export default async function getWorkspaceSchedule(
  workspaceId: string,
  now: Date,
  userId: string,
) {
  const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
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
  const scope = and(
    await projectAccessCondition(userId),
    eq(projectTable.workspaceId, workspaceId),
    isNull(projectTable.archivedAt),
    exists(openColumn),
  );
  const overdue = lt(taskTable.dueDate, now);
  const upcoming = and(gte(taskTable.dueDate, now), lt(taskTable.dueDate, end));
  const fields = {
    id: taskTable.id,
    title: taskTable.title,
    number: taskTable.number,
    projectId: projectTable.id,
    projectName: projectTable.name,
    projectSlug: projectTable.slug,
    status: taskTable.status,
    statusName: sql<string>`(select ${columnTable.name} from ${columnTable} where ${columnTable.projectId} = ${taskTable.projectId} and ${columnTable.slug} = ${taskTable.status} and ${columnTable.isFinal} is false order by ${columnTable.id} limit 1)`,
    dueDate: taskTable.dueDate,
    createdAt: taskTable.createdAt,
  };
  const list = (condition: typeof upcoming) =>
    db
      .select(fields)
      .from(taskTable)
      .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
      .where(and(scope, condition))
      .orderBy(asc(taskTable.dueDate), asc(taskTable.id))
      .limit(8);
  const [counts, overdueTasks, upcomingTasks] = await Promise.all([
    db
      .select({
        overdue: sql<number>`count(*) filter (where ${overdue})::int`,
        upcoming: sql<number>`count(*) filter (where ${upcoming})::int`,
        noDueDate: sql<number>`count(*) filter (where ${taskTable.dueDate} is null)::int`,
      })
      .from(taskTable)
      .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
      .where(scope),
    list(overdue),
    list(upcoming),
  ]);
  return {
    ...(counts[0] ?? { overdue: 0, upcoming: 0, noDueDate: 0 }),
    overdueTasks,
    upcomingTasks,
  };
}
