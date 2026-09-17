import { describe, expect, it } from "vitest";
import { getTaskLabelOptions } from "./get-task-label-options";

describe("getTaskLabelOptions", () => {
  it("excludes labels assigned to other tasks", () => {
    const labels = [
      { id: "workspace", name: "Bug", taskId: null },
      { id: "current", name: "Imported", taskId: "task-1" },
      { id: "other", name: "Other", taskId: "task-2" },
    ];

    const options = getTaskLabelOptions(labels, "task-1");

    expect(options.map((label) => label.id)).toEqual(["workspace", "current"]);
  });

  it("prefers a workspace label over a task-scoped copy", () => {
    const labels = [
      { id: "task-copy", name: "Bug", taskId: "task-1" },
      { id: "workspace", name: "Bug", taskId: null },
    ];

    const options = getTaskLabelOptions(labels, "task-1");

    expect(options).toEqual([{ id: "workspace", name: "Bug", taskId: null }]);
  });

  it("keeps same-named entries from both scopes instead of deduping them", () => {
    const labels = [
      { id: "tag", name: "Bug", taskId: null, projectId: "project-1" },
      { id: "label", name: "Bug", taskId: null, projectId: null },
    ];

    const options = getTaskLabelOptions(labels, "task-1");

    expect(options.map((label) => label.id)).toEqual(["tag", "label"]);
  });

  it("prefers a tag palette row over a tag copy on the same task", () => {
    const labels = [
      { id: "tag-copy", name: "Bug", taskId: "task-1", projectId: "project-1" },
      { id: "tag", name: "Bug", taskId: null, projectId: "project-1" },
    ];

    const options = getTaskLabelOptions(labels, "task-1");

    expect(options.map((label) => label.id)).toEqual(["tag"]);
  });
});
