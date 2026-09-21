import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ProjectWithTasks } from "@/types/project";
import { ProjectAccessSettings } from "./project-access-settings";

const state = vi.hoisted(() => ({
  manage: true,
  access: vi.fn(),
  membership: vi.fn(),
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@/hooks/use-workspace-permission", () => ({
  useWorkspacePermission: () => ({
    canManageProjectAccess: () => state.manage,
  }),
}));
vi.mock("@/hooks/queries/project/use-project-access", () => ({
  useProjectAccess: () => ({
    access: { mutate: state.access },
    membership: { mutate: state.membership },
    members: {
      data: [
        { userId: "owner", name: "Owner", inherited: true, explicit: false },
        {
          userId: "member",
          name: "Member",
          email: "member@test.local",
          inherited: false,
          explicit: true,
        },
      ],
    },
  }),
}));
vi.mock("@/hooks/queries/workspace-users/use-get-workspace-users", () => ({
  default: () => ({
    data: [
      {
        id: "new",
        userId: "new",
        user: { name: "New User", email: "new@test.local" },
      },
    ],
  }),
}));
const project = {
  id: "project",
  workspaceId: "workspace",
  accessMode: "restricted",
} as ProjectWithTasks;
afterEach(cleanup);
beforeEach(() => {
  state.manage = true;
  vi.clearAllMocks();
});

it("shows inherited access and lets managers change visibility, add and remove members", () => {
  render(<ProjectAccessSettings project={project} />);
  expect(
    screen.getByText("settings:projectAccess.inherited"),
  ).toBeInTheDocument();
  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: "workspace" },
  });
  expect(state.access).toHaveBeenCalledWith({
    id: "project",
    accessMode: "workspace",
  });
  fireEvent.click(
    screen.getByRole("button", { name: "settings:projectAccess.addNamed" }),
  );
  expect(state.membership).toHaveBeenCalledWith({
    id: "project",
    userId: "new",
    present: true,
  });
  fireEvent.click(
    screen.getByRole("button", { name: "settings:projectAccess.removeNamed" }),
  );
  expect(state.membership).toHaveBeenCalledWith({
    id: "project",
    userId: "member",
    present: false,
  });
});
it("hides membership controls for users without management permission", () => {
  state.manage = false;
  render(<ProjectAccessSettings project={project} />);
  expect(screen.getByRole("combobox")).toBeDisabled();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
it("filters the workspace member picker", () => {
  render(<ProjectAccessSettings project={project} />);
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "no-match" },
  });
  expect(screen.queryByText("New User")).not.toBeInTheDocument();
  expect(
    screen.getByText("settings:projectAccess.noMatches"),
  ).toBeInTheDocument();
});
