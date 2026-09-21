import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ProjectLayout from "./project-layout";

vi.mock("@tanstack/react-router", () => ({
  useLocation: () => ({
    pathname: "/dashboard/workspace/w1/project/p1/board",
  }),
  useNavigate: () => vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

// The header is what this test is about, so the app shell and the sibling
// navigation controls are stubbed down to their markup.
vi.mock("@/components/common/layout", () => {
  const Layout = Object.assign(
    ({ children }: { children: ReactNode }) => <div>{children}</div>,
    {
      Header: ({ children }: { children: ReactNode }) => (
        <header>{children}</header>
      ),
      Content: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    },
  );

  return { default: Layout };
});

vi.mock("@/components/ui/sidebar", () => ({
  SidebarTrigger: () => <button type="button" aria-label="Toggle sidebar" />,
}));

vi.mock("@/components/common/header/mobile-project-nav", () => ({
  default: () => null,
}));
vi.mock("@/components/common/header/project-crumb-select", () => ({
  default: () => null,
}));
vi.mock("@/components/common/header/workspace-crumb-select", () => ({
  default: () => null,
}));
vi.mock("@/components/shared/modals/create-project-modal", () => ({
  default: () => null,
}));

vi.mock("@/hooks/use-project-websocket", () => ({
  useProjectWebSocket: vi.fn(),
}));

vi.mock("@/hooks/queries/project/use-get-project", () => ({
  default: () => ({
    data: { id: "p1", name: "Work", isPublic: false },
  }),
}));

// Renders the identity it was handed, so the test proves the header passes the
// project in view rather than just that something opened.
vi.mock("@/components/project/share-project-dialog", () => ({
  ShareProjectDialog: ({
    open,
    projectId,
    projectName,
    workspaceId,
  }: {
    open: boolean;
    projectId: string;
    projectName: string;
    workspaceId: string;
  }) =>
    open ? (
      <div data-testid="share-dialog">
        {`${projectId}|${projectName}|${workspaceId}`}
      </div>
    ) : null,
}));

const SHARE_BUTTON = "common:actions.share";

function renderLayout() {
  render(
    <ProjectLayout projectId="p1" workspaceId="w1">
      <span>Board</span>
    </ProjectLayout>,
  );
}

describe("ProjectLayout header", () => {
  // No automatic cleanup is configured in this repo.
  afterEach(cleanup);

  it("puts the share action last in the header", () => {
    renderLayout();

    const shareButton = screen.getByRole("button", { name: SHARE_BUTTON });

    expect(screen.getAllByRole("button").at(-1)).toBe(shareButton);
  });

  it("shows the word beside the icon rather than the icon alone", () => {
    renderLayout();

    const shareButton = screen.getByRole("button", { name: SHARE_BUTTON });

    expect(shareButton).toHaveTextContent("common:actions.share");
    expect(shareButton.querySelector("svg")).not.toBeNull();
  });

  it("opens the share dialog for the project in view", () => {
    renderLayout();

    expect(screen.queryByTestId("share-dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: SHARE_BUTTON }));

    expect(screen.getByTestId("share-dialog")).toHaveTextContent("p1|Work|w1");
  });

  it("keeps every view name available to assistive technology", () => {
    renderLayout();

    // The labels are `sr-only` below `lg`, so they must stay in the DOM: an
    // icon-only button with no name is unusable with a screen reader.
    for (const name of [
      "Backlog",
      "Tasks",
      "tasks:calendar.title",
      "Gantt",
      "files:title",
      "tasks:view.overview",
    ]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });
});
