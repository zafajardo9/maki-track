import { Link } from "@tanstack/react-router";
import { Megaphone } from "lucide-react";
import type * as React from "react";
import { useTranslation } from "react-i18next";
import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { ThemeToggleDropdown } from "@/components/theme-toggle-dropdown";
import { TrialCard } from "@/components/trial-card";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { VersionDisplay } from "@/components/version-display";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { shortcuts } from "@/constants/shortcuts";
import useActiveWorkspace from "@/hooks/queries/workspace/use-active-workspace";
import { useRegisterShortcuts } from "@/hooks/use-keyboard-shortcuts";
import Search from "./search";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { toggleSidebar } = useSidebar();
  const { t } = useTranslation();
  const { data: workspace } = useActiveWorkspace();

  useRegisterShortcuts({
    modifierShortcuts: {
      [shortcuts.sidebar.prefix]: {
        [shortcuts.sidebar.toggle]: toggleSidebar,
      },
    },
  });

  return (
    <Sidebar
      collapsible="offcanvas"
      variant="inset"
      className="border-none pt-1.5"
      {...props}
    >
      <SidebarHeader className="pt-1 pb-1.5">
        <WorkspaceSwitcher />
      </SidebarHeader>
      <SidebarContent className="overflow-hidden gap-1 py-1">
        <Search />
        <NavMain />
        <NavProjects />
      </SidebarContent>
      <SidebarFooter>
        <TrialCard />
        <div className="flex items-center justify-between">
          <VersionDisplay />
          <div className="flex items-center gap-1">
            {workspace ? (
              <Link
                to="/dashboard/workspace/$workspaceId/announcements"
                params={{ workspaceId: workspace.id }}
                aria-label={t("navigation:sidebar.announcements")}
                title={t("navigation:sidebar.announcements")}
                className="flex items-center justify-center px-2 py-1.5 text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                <Megaphone className="size-3.5" aria-hidden="true" />
              </Link>
            ) : null}
            <ThemeToggleDropdown />
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
