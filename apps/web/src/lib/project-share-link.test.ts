import { describe, expect, it } from "vitest";
import {
  getProjectInternalLink,
  getProjectShareLink,
  getPublicProjectLink,
} from "./project-share-link";

const ORIGIN = "https://maki.example";

describe("getProjectShareLink", () => {
  it("returns the public link for a public project", () => {
    expect(
      getProjectShareLink({
        projectId: "p1",
        workspaceId: "w1",
        isPublic: true,
        origin: ORIGIN,
      }),
    ).toBe("https://maki.example/public-project/p1");
  });

  it("returns the in-app link for a private project", () => {
    expect(
      getProjectShareLink({
        projectId: "p1",
        workspaceId: "w1",
        isPublic: false,
        origin: ORIGIN,
      }),
    ).toBe("https://maki.example/dashboard/workspace/w1/project/p1");
  });

  it.each([null, undefined])(
    "treats %s as private, since only an explicit true is public",
    (isPublic) => {
      expect(
        getProjectShareLink({
          projectId: "p1",
          workspaceId: "w1",
          isPublic,
          origin: ORIGIN,
        }),
      ).toBe("https://maki.example/dashboard/workspace/w1/project/p1");
    },
  );

  it("never points a public project at the in-app route", () => {
    // The in-app route sits behind the session guard, so handing it out as a
    // share link would show an anonymous visitor a sign-in page instead.
    const link = getProjectShareLink({
      projectId: "p1",
      workspaceId: "w1",
      isPublic: true,
      origin: ORIGIN,
    });

    expect(link).not.toContain("/dashboard/");
  });
});

describe("getPublicProjectLink", () => {
  it("builds the public route for a project id", () => {
    expect(getPublicProjectLink("p1", ORIGIN)).toBe(
      "https://maki.example/public-project/p1",
    );
  });
});

describe("getProjectInternalLink", () => {
  it("builds the in-app dashboard link", () => {
    expect(
      getProjectInternalLink({
        projectId: "p1",
        workspaceId: "w1",
        origin: ORIGIN,
      }),
    ).toBe("https://maki.example/dashboard/workspace/w1/project/p1");
  });

  it("is what a private project resolves to", () => {
    // Keeps the two helpers from drifting apart.
    expect(
      getProjectShareLink({
        projectId: "p1",
        workspaceId: "w1",
        isPublic: false,
        origin: ORIGIN,
      }),
    ).toBe(
      getProjectInternalLink({
        projectId: "p1",
        workspaceId: "w1",
        origin: ORIGIN,
      }),
    );
  });
});
