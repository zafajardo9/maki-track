/**
 * Content source for the in-app announcements page.
 *
 * To publish something new, add an entry to `announcements` below — no other
 * file needs to change. Entries render newest-first automatically.
 *
 * - kind "announcement": product news, launches, company notes.
 * - kind "update": shipped changes, changelog-style entries.
 */
export type AnnouncementKind = "announcement" | "update";

export type Announcement = {
  kind: AnnouncementKind;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  title: string;
  body: string;
  /** Optional link for "read more" (release notes, docs). */
  href?: string;
};

export const announcements: Announcement[] = [
  {
    kind: "update",
    date: "2026-09-15",
    title: "Realtime boards over WebSockets",
    body: "Task moves, comments, and assignments now appear instantly for everyone on the board.",
  },
  {
    kind: "announcement",
    date: "2026-09-10",
    title: "Maki is open source",
    body: "The whole platform — API, web app, and Helm chart — is now public. Self-host it with Docker in a few minutes.",
  },
];

export function sortedAnnouncements() {
  return [...announcements].sort((a, b) => b.date.localeCompare(a.date));
}
