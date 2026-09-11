import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildAssigneeWorkload,
  buildColumnCompletion,
  buildDueDateHealth,
  buildPriorityBreakdown,
  buildProjectCompletionData,
  buildStatusBreakdown,
  buildUpcomingDeadlines,
  buildWorkspaceCompletion,
  chartColor,
  collectProjectTasks,
  completionPercentage,
  countByPriority,
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

describe("buildColumnCompletion", () => {
  const columns = [
    { slug: "to-do", name: "To Do", isFinal: false, tasks: [{}, {}] },
    { slug: "done", name: "Done", isFinal: true, tasks: [{}] },
  ];

  it("counts final columns as complete and the rest as open", () => {
    expect(buildColumnCompletion(columns)).toEqual({
      completed: 1,
      open: 2,
      percentage: 33,
    });
  });

  it("is empty when the project has no tasks in any column", () => {
    expect(
      buildColumnCompletion([
        { slug: "to-do", name: "To Do", isFinal: false, tasks: [] },
      ]),
    ).toEqual({ completed: 0, open: 0, percentage: 0 });
  });

  it("reports 100 when everything sits in a final column", () => {
    expect(
      buildColumnCompletion([
        { slug: "done", name: "Done", isFinal: true, tasks: [{}, {}] },
      ]),
    ).toEqual({ completed: 2, open: 0, percentage: 100 });
  });
});

describe("buildAssigneeWorkload", () => {
  function task(
    id: string,
    userId: string | null,
    assigneeName: string | null = null,
    assigneeImage: string | null = null,
  ) {
    return {
      id,
      title: id,
      number: 1,
      status: "to-do",
      priority: "low",
      dueDate: null,
      userId,
      assigneeName,
      assigneeImage,
    };
  }

  it("counts open tasks per assignee, busiest first", () => {
    const workload = buildAssigneeWorkload([
      {
        slug: "to-do",
        name: "To Do",
        isFinal: false,
        tasks: [
          task("a", "u1", "Ada"),
          task("b", "u1", "Ada"),
          task("c", "u2", "Bo"),
        ],
      },
    ]);

    expect(workload).toEqual([
      { key: "u1", name: "Ada", image: null, value: 2 },
      { key: "u2", name: "Bo", image: null, value: 1 },
    ]);
  });

  it("buckets tasks with no assignee together", () => {
    const workload = buildAssigneeWorkload([
      {
        slug: "to-do",
        name: "To Do",
        isFinal: false,
        tasks: [task("a", null), task("b", null)],
      },
    ]);

    expect(workload).toEqual([
      { key: "unassigned", name: null, image: null, value: 2 },
    ]);
  });

  it("ignores completed work because it is no longer a load", () => {
    const workload = buildAssigneeWorkload([
      {
        slug: "done",
        name: "Done",
        isFinal: true,
        tasks: [task("a", "u1", "Ada")],
      },
    ]);

    expect(workload).toEqual([]);
  });

  it("orders ties by name so the chart does not reshuffle", () => {
    const workload = buildAssigneeWorkload([
      {
        slug: "to-do",
        name: "To Do",
        isFinal: false,
        tasks: [task("a", "u2", "Bo"), task("b", "u1", "Ada")],
      },
    ]);

    expect(workload.map((entry) => entry.name)).toEqual(["Ada", "Bo"]);
  });
});

describe("due date helpers", () => {
  // `getDueDateStatus` reads the clock itself, so the tests pin it rather than
  // passing a date through.
  const NOW = new Date("2026-06-15T12:00:00.000Z");

  function task(
    id: string,
    dueDate: string | null,
    status = "to-do",
    assignee: { name: string; image: string } | null = null,
  ) {
    return {
      id,
      title: id,
      number: 1,
      status,
      priority: "low",
      dueDate,
      userId: assignee ? "u1" : null,
      assigneeName: assignee?.name ?? null,
      assigneeImage: assignee?.image ?? null,
    };
  }

  function board(
    tasks: ReturnType<typeof task>[],
    isFinal = false,
  ): Parameters<typeof buildDueDateHealth>[0] {
    return [
      {
        slug: isFinal ? "done" : "to-do",
        name: isFinal ? "Done" : "To Do",
        isFinal,
        tasks,
      },
    ];
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("buildDueDateHealth", () => {
    it("separates overdue, due soon and undated open work", () => {
      const health = buildDueDateHealth(
        board([
          task("overdue", "2026-06-10T00:00:00.000Z"),
          task("soon", "2026-06-16T00:00:00.000Z"),
          task("later", "2026-12-01T00:00:00.000Z"),
          task("undated", null),
        ]),
      );

      expect(health).toEqual({ overdue: 1, dueSoon: 1, noDueDate: 1 });
    });

    it("excludes completed tasks, which can no longer be late", () => {
      const health = buildDueDateHealth(
        board([task("late-but-done", "2026-06-01T00:00:00.000Z")], true),
      );

      expect(health).toEqual({ overdue: 0, dueSoon: 0, noDueDate: 0 });
    });
  });

  describe("buildUpcomingDeadlines", () => {
    it("returns the soonest open deadlines first", () => {
      const deadlines = buildUpcomingDeadlines(
        board([
          task("later", "2026-07-01T00:00:00.000Z"),
          task("sooner", "2026-06-20T00:00:00.000Z"),
        ]),
      );

      expect(deadlines.map((entry) => entry.id)).toEqual(["sooner", "later"]);
    });

    it("flags the ones already past their date", () => {
      const deadlines = buildUpcomingDeadlines(
        board([
          task("late", "2026-06-01T00:00:00.000Z"),
          task("future", "2026-07-01T00:00:00.000Z"),
        ]),
      );

      expect(deadlines.map((entry) => entry.isOverdue)).toEqual([true, false]);
    });

    it("skips tasks with no due date and ones already finished", () => {
      const deadlines = buildUpcomingDeadlines([
        {
          slug: "to-do",
          name: "To Do",
          isFinal: false,
          tasks: [
            task("undated", null),
            task("dated", "2026-07-01T00:00:00.000Z"),
          ],
        },
        {
          slug: "done",
          name: "Done",
          isFinal: true,
          tasks: [task("finished", "2026-07-01T00:00:00.000Z")],
        },
      ]);

      expect(deadlines.map((entry) => entry.id)).toEqual(["dated"]);
    });

    it("honours the limit", () => {
      const deadlines = buildUpcomingDeadlines(
        board([
          task("a", "2026-06-16T00:00:00.000Z"),
          task("b", "2026-06-17T00:00:00.000Z"),
          task("c", "2026-06-18T00:00:00.000Z"),
        ]),
        2,
      );

      expect(deadlines.map((entry) => entry.id)).toEqual(["a", "b"]);
    });
  });
});

describe("countByPriority", () => {
  it("orders the series by the canonical priority order", () => {
    expect(
      countByPriority([
        { priority: "low" },
        { priority: "urgent" },
        { priority: "urgent" },
      ]),
    ).toEqual([
      { key: "urgent", value: 2 },
      { key: "low", value: 1 },
    ]);
  });

  it("is empty for a project with no tasks", () => {
    expect(countByPriority([])).toEqual([]);
  });
});

describe("collectProjectTasks", () => {
  it("gathers column tasks plus the parked buckets", () => {
    const collected = collectProjectTasks(
      [{ slug: "to-do", name: "To Do", isFinal: false, tasks: ["a", "b"] }],
      ["planned"],
      ["archived"],
    );

    expect(collected).toEqual(["a", "b", "planned", "archived"]);
  });
});

describe("assignee identity", () => {
  // Deadlines flag overdue against the real clock, so pin it.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function task(
    id: string,
    userId: string | null,
    name: string | null,
    image: string | null,
  ) {
    return {
      id,
      title: id,
      number: 1,
      status: "to-do",
      priority: "low",
      dueDate: "2026-07-01T00:00:00.000Z",
      userId,
      assigneeName: name,
      assigneeImage: image,
    };
  }

  const columns = [
    {
      slug: "to-do",
      name: "To Do",
      isFinal: false,
      tasks: [
        task("a", "u1", "Ada Lovelace", "/api/user/avatar/u1"),
        task("b", null, null, null),
      ],
    },
  ];

  it("carries the profile picture into the workload", () => {
    // Equal counts tie-break by name, and the unassigned bucket has none, so
    // it sorts first.
    expect(buildAssigneeWorkload(columns)).toEqual([
      { key: "unassigned", name: null, image: null, value: 1 },
      {
        key: "u1",
        name: "Ada Lovelace",
        image: "/api/user/avatar/u1",
        value: 1,
      },
    ]);
  });

  it("carries the profile picture into the deadlines", () => {
    expect(buildUpcomingDeadlines(columns)).toEqual([
      {
        id: "a",
        title: "a",
        number: 1,
        status: "to-do",
        dueDate: "2026-07-01T00:00:00.000Z",
        assigneeName: "Ada Lovelace",
        assigneeImage: "/api/user/avatar/u1",
        isOverdue: false,
      },
      // The unassigned task has a due date too, so it is a deadline like any
      // other; the avatar component supplies the placeholder instead.
      {
        id: "b",
        title: "b",
        number: 1,
        status: "to-do",
        dueDate: "2026-07-01T00:00:00.000Z",
        assigneeName: null,
        assigneeImage: null,
        isOverdue: false,
      },
    ]);
  });
});
