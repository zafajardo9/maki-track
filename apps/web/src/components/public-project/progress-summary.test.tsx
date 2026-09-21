import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PublicProgressSummary } from "./progress-summary";

vi.mock("react-i18next", () => ({
  // Return the interpolated shape the assertions care about.
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${JSON.stringify(values)}` : key,
  }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

const columns = [
  { slug: "todo", name: "To do", isFinal: false, tasks: [{}, {}, {}] },
  { slug: "doing", name: "Doing", isFinal: false, tasks: [{}] },
  { slug: "done", name: "Done", isFinal: true, tasks: [{}, {}] },
];

describe("PublicProgressSummary", () => {
  // No automatic cleanup is configured in this repo.
  afterEach(cleanup);

  it("renders the donut with completed and open legend values", () => {
    render(<PublicProgressSummary columns={columns} />);

    expect(
      screen.getByText("publicProject:progress.completed"),
    ).toBeInTheDocument();
    expect(screen.getByText("publicProject:progress.open")).toBeInTheDocument();
    // 2 completed, 4 open -> 33%.
    expect(
      screen.getByText('publicProject:progress.percent:{"percent":33}'),
    ).toBeInTheDocument();
    // Legend values sit in the same row as their labels.
    const completedRow = screen
      .getByText("publicProject:progress.completed")
      .closest("li");
    const openRow = screen
      .getByText("publicProject:progress.open")
      .closest("li");
    expect(completedRow).toHaveTextContent("2");
    expect(openRow).toHaveTextContent("4");
  });

  it("lists every column with its task count", () => {
    render(<PublicProgressSummary columns={columns} />);

    expect(screen.getByText("To do")).toBeInTheDocument();
    expect(screen.getByText("Doing")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("renders nothing when the project has no tasks", () => {
    const { container } = render(
      <PublicProgressSummary
        columns={[{ slug: "todo", name: "To do", isFinal: false, tasks: [] }]}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
