// Chart data lives in this file as plain functions on purpose: the workspace
// overview and the board both feed charts from data the app already fetches,
// so the only new logic is turning that data into series. Keeping it pure and
// free of i18n makes it cheap to unit test.

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

type BoardColumnLike = {
  slug: string;
  name: string;
  isFinal: boolean;
  tasks: ReadonlyArray<unknown>;
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

export type WorkspaceCompletion = {
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
): WorkspaceCompletion {
  let completed = 0;
  let open = 0;

  for (const project of projects) {
    completed += project.statistics.completedTasks;
    open += project.statistics.openTasks;
  }

  return { completed, open, percentage: completionPercentage(completed, open) };
}

/**
 * Priority totals across every project. Known priorities keep their display
 * order; anything unexpected is appended rather than dropped so a value the
 * API adds later still shows up.
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
