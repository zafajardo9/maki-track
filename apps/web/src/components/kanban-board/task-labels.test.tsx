import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TaskLabels } from "./task-labels";

afterEach(() => {
  cleanup();
});

describe("TaskLabels", () => {
  it("renders labels supplied by the task", () => {
    render(
      <TaskLabels labels={[{ id: "label-1", name: "Bug", color: "red" }]} />,
    );

    expect(screen.getByText("Bug")).toBeVisible();
  });
  it("renders both same-named scopes with the project tag first", () => {
    const { container } = render(
      <TaskLabels
        labels={[
          { id: "label", name: "Bug", color: "red", projectId: null },
          { id: "tag", name: "Bug", color: "green", projectId: "project-1" },
        ]}
      />,
    );
    expect(screen.getAllByText("Bug")).toHaveLength(2);
    expect(container.querySelector("span[style]")).toHaveStyle({
      "--label-color": "var(--color-green-600)",
    });
  });
});
