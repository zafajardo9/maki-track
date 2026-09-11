import { describe, expect, it } from "vitest";
import {
  buildPriorityBreakdown,
  buildProjectCompletionData,
  buildStatusBreakdown,
  buildWorkspaceCompletion,
  chartColor,
  completionPercentage,
} from "./chart-data";

function project(
  id: string,
  statistics: Partial<{
    totalTasks: number;
    completedTasks: number;
    openTasks: number;
    completionPercentage: number;
    byPriority: Record<string, number>;
  }> = {},
) {
  return {
    id,
    name: `Project ${id}`,
    statistics: {
      totalTasks: 0,
      completedTasks: 0,
      openTasks: 0,
      completionPercentage: 0,
      byPriority: {},
      ...statistics,
    },
  };
}

describe("completionPercentage", () => {
  it("is the share of in-play tasks that are complete", () => {
    expect(completionPercentage(1, 2)).toBe(33);
    expect(completionPercentage(3, 1)).toBe(75);
  });

  it("is zero when nothing is in play", () => {
    expect(completionPercentage(0, 0)).toBe(0);
  });

  it("is full when nothing is open", () => {
    expect(completionPercentage(4, 0)).toBe(100);
  });
});

describe("buildStatusBreakdown", () => {
  it("counts the tasks in each column and keeps board order", () => {
    const breakdown = buildStatusBreakdown([
      { slug: "to-do", name: "To Do", isFinal: false, tasks: [{}, {}] },
      { slug: "done", name: "Done", isFinal: true, tasks: [{}] },
      { slug: "in-progress", name: "In Progress", isFinal: false, tasks: [] },
    ]);

    expect(breakdown).toEqual([
      { slug: "to-do", name: "To Do", isFinal: false, value: 2 },
      { slug: "done", name: "Done", isFinal: true, value: 1 },
      { slug: "in-progress", name: "In Progress", isFinal: false, value: 0 },
    ]);
  });

  it("tolerates a project with no columns", () => {
    expect(buildStatusBreakdown([])).toEqual([]);
  });
});

describe("buildWorkspaceCompletion", () => {
  it("sums counts across projects", () => {
    const result = buildWorkspaceCompletion([
      project("a", { completedTasks: 1, openTasks: 1 }),
      project("b", { completedTasks: 2, openTasks: 2 }),
    ]);

    expect(result).toEqual({ completed: 3, open: 3, percentage: 50 });
  });

  it("weights by task count instead of averaging project percentages", () => {
    // A 100-task project that is fully done dominates a 1-task project that is
    // not started. Averaging the two percentages would report 50%.
    const result = buildWorkspaceCompletion([
      project("big", { completedTasks: 100, openTasks: 0 }),
      project("small", { completedTasks: 0, openTasks: 1 }),
    ]);

    expect(result.percentage).toBe(99);
  });

  it("ignores parked work because it is not in either count", () => {
    const result = buildWorkspaceCompletion([
      project("a", { totalTasks: 10, completedTasks: 1, openTasks: 1 }),
    ]);

    expect(result).toEqual({ completed: 1, open: 1, percentage: 50 });
  });

  it("is empty for a workspace with no projects", () => {
    expect(buildWorkspaceCompletion([])).toEqual({
      completed: 0,
      open: 0,
      percentage: 0,
    });
  });
});

describe("buildPriorityBreakdown", () => {
  it("sums per-priority totals across projects in display order", () => {
    const breakdown = buildPriorityBreakdown([
      project("a", { byPriority: { low: 1, urgent: 2 } }),
      project("b", { byPriority: { urgent: 1, high: 3 } }),
    ]);

    expect(breakdown).toEqual([
      { key: "urgent", value: 3 },
      { key: "high", value: 3 },
      { key: "low", value: 1 },
    ]);
  });

  it("omits priorities that no task uses", () => {
    const breakdown = buildPriorityBreakdown([
      project("a", { byPriority: { medium: 2 } }),
    ]);

    expect(breakdown).toEqual([{ key: "medium", value: 2 }]);
  });

  it("keeps an unrecognized priority rather than dropping the tasks", () => {
    const breakdown = buildPriorityBreakdown([
      project("a", { byPriority: { blocker: 2, low: 1 } }),
    ]);

    expect(breakdown).toEqual([
      { key: "low", value: 1 },
      { key: "blocker", value: 2 },
    ]);
  });

  it("is empty when no project has tasks", () => {
    expect(buildPriorityBreakdown([project("a")])).toEqual([]);
  });
});

describe("buildProjectCompletionData", () => {
  it("passes the API percentage through untouched", () => {
    const data = buildProjectCompletionData([
      project("a", {
        totalTasks: 4,
        completedTasks: 1,
        openTasks: 2,
        completionPercentage: 33,
      }),
    ]);

    expect(data).toEqual([
      {
        id: "a",
        name: "Project a",
        percentage: 33,
        completedTasks: 1,
        openTasks: 2,
        totalTasks: 4,
      },
    ]);
  });
});

describe("chartColor", () => {
  it("cycles through the theme tokens", () => {
    expect(chartColor(0)).toBe("var(--chart-1)");
    expect(chartColor(4)).toBe("var(--chart-5)");
    expect(chartColor(5)).toBe("var(--chart-1)");
  });
});
