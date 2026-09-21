import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProjectFiles } from "./project-files";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="/">{children}</a>,
}));

vi.mock("@/hooks/queries/project/use-get-project", () => ({
  default: () => ({ data: { id: "p1", name: "Work", slug: "DEP" } }),
}));

vi.mock("@/hooks/queries/project/use-get-project-files", () => ({
  default: () => ({
    data: {
      data: [],
      pagination: { page: 1, pageSize: 24, total: 0, totalPages: 1 },
      totalSize: 0,
    },
    isFetching: false,
    isLoading: false,
  }),
}));

const SEARCH_LABEL = "files:searchPlaceholder";

function renderFiles() {
  render(<ProjectFiles projectId="p1" workspaceId="w1" />);
}

describe("ProjectFiles", () => {
  // No automatic cleanup is configured in this repo.
  afterEach(cleanup);

  it("keeps the search icon in an addon placed after the input", () => {
    // The icon used to be absolutely positioned beside an `Input` that carried
    // the offset as wrapper padding, which stacked on the input's own padding
    // and left a dead gap between the icon and the text.
    renderFiles();

    const input = screen.getByLabelText(SEARCH_LABEL);
    const group = input.closest('[data-slot="input-group"]');
    const addon = group?.querySelector('[data-slot="input-group-addon"]');

    expect(group).not.toBeNull();
    expect(addon?.querySelector("svg")).not.toBeNull();

    // coss places the leading addon with `order-first`, so it has to stay after
    // the input in the DOM or focus order breaks.
    expect(
      input.compareDocumentPosition(addon as Node) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("names the search field and the filter controls for assistive technology", () => {
    renderFiles();

    expect(screen.getByLabelText(SEARCH_LABEL)).toBeInTheDocument();
    for (const name of [
      "files:filterAll",
      "files:filterImages",
      "files:filterFiles",
    ]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });

  it("offers a clear control only once something is typed", () => {
    renderFiles();

    const input = screen.getByLabelText(SEARCH_LABEL);

    expect(screen.queryByLabelText("files:clearSearch")).toBeNull();

    fireEvent.change(input, { target: { value: "contract" } });

    expect(input).toHaveValue("contract");

    fireEvent.click(screen.getByLabelText("files:clearSearch"));

    expect(input).toHaveValue("");
    expect(screen.queryByLabelText("files:clearSearch")).toBeNull();
  });

  it("explains the empty project instead of showing an empty list", () => {
    renderFiles();

    expect(screen.getByText("files:emptyTitle")).toBeInTheDocument();
    expect(screen.queryByText("files:noResultsTitle")).toBeNull();
  });
});
