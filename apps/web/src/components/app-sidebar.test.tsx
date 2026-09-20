import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";

// `initReactI18next` is required because importing the sidebar pulls in the UI
// kit, which initialises the real i18n instance at module scope.
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

// jsdom has no matchMedia, which `useIsMobile` reads on mount.
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));

vi.mock("@/hooks/use-keyboard-shortcuts", () => ({
  useRegisterShortcuts: () => {},
  getModifierKeyText: () => "ctrl",
}));

// The announcements button uses the router's Link; render it as a plain anchor.
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    children,
    ...rest
  }: {
    to: string;
    params?: Record<string, string>;
    children: React.ReactNode;
  }) => {
    const href = to.replace(
      /\$(\w+)/g,
      (_, key: string) => params?.[key] ?? "",
    );
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  },
  useParams: () => ({}),
}));

vi.mock("@/hooks/queries/workspace/use-active-workspace", () => ({
  default: () => ({ data: { id: "workspace-1" } }),
}));

// Isolate the footer: sibling sections fetch data and need heavy providers.
vi.mock("@/components/nav-main", () => ({ NavMain: () => null }));
vi.mock("@/components/nav-projects", () => ({ NavProjects: () => null }));
vi.mock("@/components/workspace-switcher", () => ({
  WorkspaceSwitcher: () => null,
}));
vi.mock("@/components/trial-card", () => ({ TrialCard: () => null }));
vi.mock("@/components/theme-toggle-dropdown", () => ({
  ThemeToggleDropdown: () => null,
}));
vi.mock("@/components/version-display", () => ({ VersionDisplay: () => null }));
vi.mock("./search", () => ({ default: () => null }));

describe("AppSidebar", () => {
  // No automatic cleanup is configured in this repo.
  afterEach(cleanup);

  it("renders an announcements link to the in-app announcements page", () => {
    render(
      <SidebarProvider>
        <AppSidebar />
      </SidebarProvider>,
    );

    const link = screen.getByRole("link", {
      name: "navigation:sidebar.announcements",
    });
    expect(link).toHaveAttribute(
      "href",
      "/dashboard/workspace/workspace-1/announcements",
    );
    expect(link).not.toHaveAttribute("target");
  });
});
