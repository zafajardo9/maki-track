// Chart data lives in this file as plain functions on purpose: the workspace
// overview and the board both feed charts from data the app already fetches,
// so the only new logic is turning that data into series. Keeping it pure and
// free of i18n makes it cheap to unit test.

import { getDueDateStatus } from "@/lib/due-date-status";

// `--chart-*` are defined in index.css for both themes and exposed to Tailwind
// through `@theme inline`. The values are read as CSS variables rather than
// Tailwind classes because a dynamically built class name like `fill-chart-3`
// would not survive Tailwind's static scan.
export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
] as const;

export function chartColor(index: number) {
  return CHART_COLORS[index % CHART_COLORS.length];
}

/** Display order for priorities, highest first. Mirrors VALID_PRIORITIES. */
export const PRIORITY_ORDER = [
  "urgent",
  "high",
  "medium",
  "low",
  "no-priority",
] as const;

export type ChartDatum = {
  /** Stable identity for React keys and for looking up a translated label. */
  key: string;
  value: number;
};

export type BoardTaskLike = {
  id: string;
  title: string;
  number: number | null;
  status: string;
  priority: string;
  dueDate: string | null;
  userId: string | null;
  assigneeName: string | null;
  assigneeImage: string | null;
};

export type BoardColumnLike<TTask = unknown> = {
  slug: string;
  name: string;
  isFinal: boolean;
  tasks: ReadonlyArray<TTask>;
};

export type StatusDatum = {
  slug: string;
  name: string;
  isFinal: boolean;
  value: number;
};

type ProjectStatisticsLike = {
  totalTasks: number;
  completedTasks: number;
  openTasks: number;
  completionPercentage: number;
  byPriority: Record<string, number>;
};

type ProjectLike = {
  id: string;
  name: string;
  statistics: ProjectStatisticsLike;
};

export type ProjectCompletionDatum = {
  id: string;
  name: string;
  /** Taken straight from the API so the chart cannot disagree with the table. */
  percentage: number;
  completedTasks: number;
  openTasks: number;
  totalTasks: number;
};

export type CompletionSummary = {
  completed: number;
  open: number;
  percentage: number;
};

/**
 * Percentage of the tasks that sit in a column which that column marks final.
 * Planned and archived tasks are outside this population, so parking work
 * neither raises nor lowers the figure. Mirrors the same calculation the API
 * performs for `completionPercentage`.
 */
export function completionPercentage(completed: number, open: number) {
  const inPlay = completed + open;
  return inPlay > 0 ? Math.round((completed / inPlay) * 100) : 0;
}

/**
 * Task counts per board column, in board order. The board groups a task into a
 * column by `task.status === column.slug`, and the board payload already ships
 * each column with its tasks, so this is a straight projection.
 */
export function buildStatusBreakdown(
  columns: ReadonlyArray<BoardColumnLike>,
): StatusDatum[] {
  return columns.map((column) => ({
    slug: column.slug,
    name: column.name,
    isFinal: column.isFinal,
    value: column.tasks.length,
  }));
}

/**
 * Workspace-wide completion. The percentage is computed from the summed counts
 * rather than by averaging each project's percentage, which would weigh a
 * three-task project the same as a three-hundred-task one.
 */
export function buildWorkspaceCompletion(
  projects: ReadonlyArray<ProjectLike>,
): CompletionSummary {
  let completed = 0;
  let open = 0;

  for (const project of projects) {
    completed += project.statistics.completedTasks;
    open += project.statistics.openTasks;
  }

  return { completed, open, percentage: completionPercentage(completed, open) };
}

/**
 * Order priority totals for display. Known priorities keep the canonical order;
 * anything unexpected is appended rather than dropped, so a value the API adds
 * later still shows up instead of silently losing its tasks.
 */
function orderPriorityTotals(totals: Map<string, number>): ChartDatum[] {
  const known: ChartDatum[] = PRIORITY_ORDER.filter(
    (priority) => (totals.get(priority) ?? 0) > 0,
  ).map((priority) => ({ key: priority, value: totals.get(priority) ?? 0 }));

  const unexpected: ChartDatum[] = [...totals.keys()]
    .filter(
      (priority) => !(PRIORITY_ORDER as readonly string[]).includes(priority),
    )
    .sort()
    .map((priority) => ({ key: priority, value: totals.get(priority) ?? 0 }));

  return [...known, ...unexpected];
}

/**
 * Priority totals across every project. Planned and archived tasks are included
 * here, matching the API's per-project `byPriority`, which counts every task in
 * the project rather than only the ones sitting in a column.
 */
export function buildPriorityBreakdown(
  projects: ReadonlyArray<ProjectLike>,
): ChartDatum[] {
  const totals = new Map<string, number>();

  for (const project of projects) {
    for (const [priority, count] of Object.entries(
      project.statistics.byPriority,
    )) {
      totals.set(priority, (totals.get(priority) ?? 0) + count);
    }
  }

  return orderPriorityTotals(totals);
}

/**
 * Priority totals for one project's tasks. Same population rule as
 * `buildPriorityBreakdown`: pass every task, parked ones included.
 */
export function countByPriority(
  tasks: ReadonlyArray<{ priority: string }>,
): ChartDatum[] {
  const totals = new Map<string, number>();

  for (const task of tasks) {
    totals.set(task.priority, (totals.get(task.priority) ?? 0) + 1);
  }

  return orderPriorityTotals(totals);
}

/**
 * Every task in a project, flattening the board's columns and adding the parked
 * buckets back in.
 */
export function collectProjectTasks<TTask>(
  columns: ReadonlyArray<BoardColumnLike<TTask>>,
  planned: ReadonlyArray<TTask>,
  archived: ReadonlyArray<TTask>,
): TTask[] {
  return [
    ...columns.flatMap((column) => column.tasks),
    ...planned,
    ...archived,
  ];
}

/**
 * Completion for a single project. Counts only the tasks that sit in a column,
 * so planned and archived tasks stay outside the population — the same rule the
 * API applies when it reports `completionPercentage`.
 */
export function buildColumnCompletion(
  columns: ReadonlyArray<BoardColumnLike>,
): CompletionSummary {
  let completed = 0;
  let open = 0;

  for (const column of columns) {
    if (column.isFinal) {
      completed += column.tasks.length;
    } else {
      open += column.tasks.length;
    }
  }

  return { completed, open, percentage: completionPercentage(completed, open) };
}

export type AssigneeDatum = {
  /** The user id, or `unassigned`. */
  key: string;
  /** Resolved name, or null for the unassigned bucket. */
  name: string | null;
  /** Profile picture, or null when the user has none set. */
  image: string | null;
  value: number;
};

/**
 * Open tasks per assignee. Only tasks in a non-final column count, because the
 * question this answers is who still has work in flight.
 */
export function buildAssigneeWorkload(
  columns: ReadonlyArray<BoardColumnLike<BoardTaskLike>>,
): AssigneeDatum[] {
  const totals = new Map<string, AssigneeDatum>();

  for (const column of columns) {
    if (column.isFinal) continue;

    for (const task of column.tasks) {
      const key = task.userId ?? "unassigned";
      const existing = totals.get(key);

      if (existing) {
        existing.value += 1;
      } else {
        totals.set(key, {
          key,
          name: task.assigneeName ?? null,
          image: task.assigneeImage ?? null,
          value: 1,
        });
      }
    }
  }

  // Busiest first; ties broken by name so the order is stable between renders.
  return [...totals.values()].sort(
    (a, b) => b.value - a.value || (a.name ?? "").localeCompare(b.name ?? ""),
  );
}

export type DueDateHealth = {
  overdue: number;
  dueSoon: number;
  noDueDate: number;
};

export type UpcomingDeadline = {
  id: string;
  title: string;
  number: number | null;
  status: string;
  dueDate: string;
  assigneeName: string | null;
  assigneeImage: string | null;
  isOverdue: boolean;
};

/**
 * Due-date health across the project's open work. Uses `getDueDateStatus` from
 * `lib/due-date-status` so the thresholds (overdue, due-soon within three days)
 * are the same ones the task cards and list views already show.
 */
export function buildDueDateHealth(
  columns: ReadonlyArray<BoardColumnLike<BoardTaskLike>>,
): DueDateHealth {
  let overdue = 0;
  let dueSoon = 0;
  let noDueDate = 0;

  for (const column of columns) {
    if (column.isFinal) continue;

    for (const task of column.tasks) {
      const status = getDueDateStatus(task.dueDate);

      if (status === "overdue") overdue += 1;
      else if (status === "due-soon") dueSoon += 1;
      else if (status === "no-due-date") noDueDate += 1;
    }
  }

  return { overdue, dueSoon, noDueDate };
}

/**
 * The soonest deadlines among the project's open work, most urgent first.
 * Completed tasks are excluded: a finished task is not a deadline.
 */
export function buildUpcomingDeadlines(
  columns: ReadonlyArray<BoardColumnLike<BoardTaskLike>>,
  limit = 6,
): UpcomingDeadline[] {
  const withDueDates: UpcomingDeadline[] = [];

  for (const column of columns) {
    if (column.isFinal) continue;

    for (const task of column.tasks) {
      if (!task.dueDate) continue;

      withDueDates.push({
        id: task.id,
        title: task.title,
        number: task.number,
        status: task.status,
        dueDate: task.dueDate,
        assigneeName: task.assigneeName ?? null,
        assigneeImage: task.assigneeImage ?? null,
        isOverdue: getDueDateStatus(task.dueDate) === "overdue",
      });
    }
  }

  return withDueDates
    .sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    )
    .slice(0, limit);
}

/** One entry per project, for the per-project progress chart. */
export function buildProjectCompletionData(
  projects: ReadonlyArray<ProjectLike>,
): ProjectCompletionDatum[] {
  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    percentage: project.statistics.completionPercentage,
    completedTasks: project.statistics.completedTasks,
    openTasks: project.statistics.openTasks,
    totalTasks: project.statistics.totalTasks,
  }));
}
