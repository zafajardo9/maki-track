/**
 * Content source for the marketing /updates page.
 *
 * To publish something new, add an entry to `updateEntries` below — no other
 * file needs to change. Entries render newest-first automatically.
 *
 * - kind "announcement": product news, launches, company notes.
 * - kind "update": shipped changes, changelog-style entries.
 * - kind "goal": roadmap items. Goals must also set `status`.
 */
export type UpdateKind = "announcement" | "update" | "goal";

export type GoalStatus = "planned" | "in-progress" | "shipped";

export type UpdateEntry = {
  kind: UpdateKind;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  title: string;
  body: string;
  /** Required for goals, ignored otherwise. */
  status?: GoalStatus;
  /** Optional link for "read more" (release notes, guide, docs). */
  href?: string;
};

export const updateEntries: UpdateEntry[] = [
  {
    kind: "goal",
    status: "in-progress",
    date: "2026-09-01",
    title: "Granular workspace roles",
    body: "Custom roles built from the @maki/permissions vocabulary, so teams can go beyond the built-in member and admin roles.",
  },
  {
    kind: "goal",
    status: "planned",
    date: "2026-09-01",
    title: "Offline-first web app",
    body: "Boards that keep working on a flaky connection and sync when the network comes back.",
  },
  {
    kind: "announcement",
    date: "2026-09-10",
    title: "Maki is open source",
    body: "The whole platform — API, web app, and Helm chart — is now public. Self-host it with Docker in a few minutes.",
    href: "/guides/self-host-project-management-docker",
  },
  {
    kind: "update",
    date: "2026-09-15",
    title: "Realtime boards over WebSockets",
    body: "Task moves, comments, and assignments now appear instantly for everyone on the board, with optional Redis fan-out for multi-instance deployments.",
  },
];

export const goalStatusOrder: GoalStatus[] = [
  "in-progress",
  "planned",
  "shipped",
];

export const goalStatusLabel: Record<GoalStatus, string> = {
  "in-progress": "In progress",
  planned: "Planned",
  shipped: "Shipped",
};

export function sortedUpdates() {
  return [...updateEntries].sort((a, b) => b.date.localeCompare(a.date));
}

export function goalEntries() {
  return sortedUpdates().filter(
    (entry): entry is UpdateEntry & { status: GoalStatus } =>
      entry.kind === "goal" && entry.status !== undefined,
  );
}

export function timelineEntries() {
  return sortedUpdates().filter((entry) => entry.kind !== "goal");
}
