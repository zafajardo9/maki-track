import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SidebarProvider } from "@/components/ui/sidebar";
import { NavProjects } from "./nav-projects";

const mocks = vi.hoisted(() => ({
  projects: [] as Array<{ id: string; name: string; icon: string | null }>,
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({}),
}));

// `initReactI18next` is required because importing the sidebar pulls in the UI
// kit, which initialises the real i18n instance at module scope.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

// jsdom has no matchMedia, which `useIsMobile` reads on mount.
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));

vi.mock("@/hooks/queries/project/use-get-projects", () => ({
  default: () => ({ data: mocks.projects }),
}));

vi.mock("@/hooks/queries/workspace/use-active-workspace", () => ({
  default: () => ({ data: { id: "workspace-1" } }),
}));

vi.mock("@/hooks/use-workspace-permission", () => ({
  useWorkspacePermission: () => ({
    canCreateProjects: () => true,
    canDeleteProjects: () => true,
    canUpdateProjects: () => true,
  }),
}));

vi.mock("@/hooks/mutations/project/use-delete-project", () => ({
  default: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("@/hooks/mutations/project/use-reorder-projects", () => ({
  default: () => vi.fn(),
}));

vi.mock("@/components/shared/modals/create-project-modal", () => ({
  default: () => null,
}));

vi.mock("@/components/project/share-project-dialog", () => ({
  ShareProjectDialog: () => null,
}));

vi.mock("@/lib/toast", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

function renderProjects() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <SidebarProvider>
        <NavProjects />
      </SidebarProvider>
    </QueryClientProvider>,
  );
}

/** The icon rendered inside a project's own row. */
function rowIcon(projectName: string) {
  const row = screen.getByRole("button", { name: projectName });
  return row.querySelector("svg")?.getAttribute("class") ?? "";
}

describe("NavProjects", () => {
  beforeEach(() => {
    mocks.projects = [];
  });

  // No automatic cleanup is configured in this repo.
  afterEach(cleanup);

  it("renders the icon picked for each project beside its name", () => {
    mocks.projects = [
      { id: "p1", name: "Work", icon: "Rocket" },
      { id: "p2", name: "Personal", icon: "Heart" },
    ];

    renderProjects();

    expect(rowIcon("Work")).toContain("lucide-rocket");
    expect(rowIcon("Personal")).toContain("lucide-heart");
  });

  it("falls back to the default icon when no icon was picked", () => {
    mocks.projects = [{ id: "p1", name: "Legacy", icon: null }];

    renderProjects();

    // `Layout` is lucide's alias, so it renders under the canonical name.
    expect(rowIcon("Legacy")).toContain("lucide-panels-top-left");
  });

  it("falls back to the default icon when the picked name is unknown", () => {
    mocks.projects = [{ id: "p1", name: "Stale", icon: "NotAnIcon" }];

    renderProjects();

    expect(rowIcon("Stale")).toContain("lucide-panels-top-left");
  });
});
