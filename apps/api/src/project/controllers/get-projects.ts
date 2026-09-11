import { and, eq, isNull, sql } from "drizzle-orm";
import db from "../../database";
import { columnTable, projectTable, taskTable } from "../../database/schema";

type ProjectStatistics = {
  completionPercentage: number;
  totalTasks: number;
  completedTasks: number;
  openTasks: number;
  overdueTasks: number;
  byPriority: Record<string, number>;
  dueDate: Date | null;
};

const EMPTY_STATISTICS: ProjectStatistics = {
  completionPercentage: 0,
  totalTasks: 0,
  completedTasks: 0,
  openTasks: 0,
  overdueTasks: 0,
  byPriority: {},
  dueDate: null,
};

function scopeToWorkspace(workspaceId: string, includeArchived: boolean) {
  return includeArchived
    ? eq(projectTable.workspaceId, workspaceId)
    : and(
        eq(projectTable.workspaceId, workspaceId),
        isNull(projectTable.archivedAt),
      );
}

// A task is "completed" when the column it sits in is final. That is a
// user-editable per-column flag (`column.isFinal`), which is also what the
// board, list view, and public project views use. It is deliberately NOT a
// hardcoded `status = 'done'` check: the slug is not editable through the API,
// but users can mark any column final or clear the flag on the default "Done"
// column, and the two definitions then disagree about the same board.
//
// `planned` and `archived` are virtual statuses, not columns, so tasks parked
// there match no column and fall outside the completion population entirely.
// Parking finished work must not move the completion percentage in either
// direction.
async function getProjectStatistics(
  workspaceId: string,
  includeArchived: boolean,
) {
  const statisticsByProject = new Map<string, ProjectStatistics>();

  // Aggregate in the database instead of loading every task row into memory.
  // This endpoint needs a handful of numbers per project; the previous
  // `with: { tasks: true }` made both the query and the response grow linearly
  // with the number of tasks in the workspace. Scoping by workspaceId through
  // a join (rather than an `IN (...projectIds)` list) keeps the statement size
  // constant regardless of how many projects the workspace has.
  //
  // The column join is on (projectId, slug) because the board assigns a task to
  // its column by `task.status === column.slug`. There is no unique constraint
  // on that pair (uniqueness is enforced in application code when a column is
  // created), so every count is `distinct task.id` to stay correct even if two
  // columns ever share a slug.
  const rows = await db
    .select({
      projectId: taskTable.projectId,
      totalTasks: sql<number>`count(distinct ${taskTable.id})`,
      completedTasks: sql<number>`count(distinct case when ${columnTable.isFinal} is true then ${taskTable.id} end)`,
      openTasks: sql<number>`count(distinct case when ${columnTable.isFinal} is false then ${taskTable.id} end)`,
      overdueTasks: sql<number>`count(distinct case when ${columnTable.isFinal} is false and ${taskTable.dueDate} is not null and ${taskTable.dueDate} < ${new Date()} then ${taskTable.id} end)`,
      dueDate: sql<Date | null>`min(case when ${columnTable.isFinal} is false then ${taskTable.dueDate} end)`,
    })
    .from(taskTable)
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .leftJoin(
      columnTable,
      and(
        eq(columnTable.projectId, taskTable.projectId),
        eq(columnTable.slug, taskTable.status),
      ),
    )
    .where(scopeToWorkspace(workspaceId, includeArchived))
    .groupBy(taskTable.projectId);

  // Priority is independent of column membership, so it is counted over every
  // task in the project rather than only the ones sitting in a column. The
  // chart then describes all the work, backlog included.
  const priorityRows = await db
    .select({
      projectId: taskTable.projectId,
      priority: taskTable.priority,
      count: sql<number>`count(*)`,
    })
    .from(taskTable)
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .where(scopeToWorkspace(workspaceId, includeArchived))
    .groupBy(taskTable.projectId, taskTable.priority);

  const byPriorityPerProject = new Map<string, Record<string, number>>();
  for (const row of priorityRows) {
    const counts = byPriorityPerProject.get(row.projectId) ?? {};
    counts[row.priority] = Number(row.count);
    byPriorityPerProject.set(row.projectId, counts);
  }

  for (const row of rows) {
    const totalTasks = Number(row.totalTasks);
    const completedTasks = Number(row.completedTasks);
    const openTasks = Number(row.openTasks);
    const inPlay = completedTasks + openTasks;

    statisticsByProject.set(row.projectId, {
      totalTasks,
      completedTasks,
      openTasks,
      overdueTasks: Number(row.overdueTasks),
      completionPercentage:
        inPlay > 0 ? Math.round((completedTasks / inPlay) * 100) : 0,
      byPriority: byPriorityPerProject.get(row.projectId) ?? {},
      dueDate: row.dueDate ? new Date(row.dueDate) : null,
    });
  }

  return statisticsByProject;
}

async function getProjects(workspaceId: string, includeArchived = false) {
  const projects = await db.query.projectTable.findMany({
    where: includeArchived
      ? eq(projectTable.workspaceId, workspaceId)
      : and(
          eq(projectTable.workspaceId, workspaceId),
          isNull(projectTable.archivedAt),
        ),
    // `id` is the deterministic tie-breaker: without it, rows sharing both a
    // position and a createdAt come back in an unspecified order.
    orderBy: (project, { asc }) => [
      asc(project.position),
      asc(project.createdAt),
      asc(project.id),
    ],
  });

  const statisticsByProject = await getProjectStatistics(
    workspaceId,
    includeArchived,
  );

  return projects.map((project) => ({
    ...project,
    statistics: statisticsByProject.get(project.id) ?? EMPTY_STATISTICS,
    archivedTasks: [],
    plannedTasks: [],
    columns: [],
  }));
}

export default getProjects;
