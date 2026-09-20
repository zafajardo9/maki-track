# Plan 002 — Workspace top tasks queue

Status: **implemented — phases 1–4 complete, with limits recorded below**
Date: 2026-09-18
Source: discovery conversation on the workspace Dashboard tab; decisions recorded below.

## Summary

The workspace Dashboard answers *what is late* (the `Task schedule` card) but never
*what should I work on next*. Tasks with no due date never appear there, and a
member's own assigned work is only discoverable by opening projects one at a time.

Add a bounded, ranked task list directly under the Dashboard tab heading: my open
tasks by default, every member's open tasks behind a toggle, each row a link to the
task's detail page.

## Locked decisions

| Decision | Choice | Rejected alternative |
| --- | --- | --- |
| Which tasks | Assigned to me by default, `all` behind a toggle | Workspace-wide only (noisy, not a work queue); mine only (empty for new members) |
| Ranking | Overdue → nearest due date → priority (urgent→low) → id | Priority first (buries overdue work); recently updated (no urgency signal) |
| Click behaviour | Open the task detail page; change no state | One-click "Start" that mutates status (needs mutation path, permission, event) |
| Placement | Top of the Dashboard tab, 8 rows | Below the charts (needs scrolling); replacing `Task schedule` (loses the deadline framing) |
| "View all" | Dropped — the `all` toggle is the view-all | A dedicated paginated tasks page (a second feature); linking to Search (requires a typed query, so it is not a list) |
| Project page | Not mounted there | Also mounting on the project Overview (a second mode and mount point) |
| API shape | New bounded `GET /{workspaceId}/tasks` | Extending `/schedule` (conflates deadlines with a work queue); per-project `/tasks/{projectId}` fan-out (violates "never load every board to render the workspace home") |
| Assignee resolution | From the session `userId` server-side | A client-supplied user id (would let a member request another member's queue) |

## Data model

Nothing is stored. Every field is derived per request from `taskTable` joined to
`projectTable`; there is no migration, no new table, and no new event.

Scope predicate is copied verbatim from `get-workspace-schedule.ts`:

- the project belongs to the workspace,
- the project is not archived (`archived_at is null`),
- an open (non-final) column exists for the task's status — so `planned` and
  `archived` virtual statuses, and any custom final column, are excluded.

`scope=mine` adds `task.assignee_id = <session user>`; `scope=all` omits it.
`index("task_assigneeId_idx")` already covers the assignee filter.

Ordering:

1. bucket: overdue (`due_date < now`) → dated → undated,
2. `due_date asc` (Postgres defaults to `nulls last`),
3. priority rank: `urgent 0 / high 1 / medium 2 / low 3 / no-priority 4`,
4. `id asc` for a stable order.

## Surfaces touched

- API: route, query schema, response schema, controller, integration test.
- Web: fetcher, query hook, card component, mount point in the workspace route.
- i18n: `en-US` keys plus the 18-locale backfill (`pnpm i18n:check:fix`).

Not touched: database schema, events, WebSockets, MCP, webhooks, docs, Helm, Docker.

## Phases

### Phase 1 — API

Files:

- `apps/api/src/workspace/controllers/get-workspace-tasks.ts` (new)
- `apps/api/src/workspace/schema.ts` — add `workspaceTasksQuery`
- `apps/api/src/workspace/response.ts` — add `workspaceTaskListSchema`
- `apps/api/src/workspace/index.ts` — add `listWorkspaceTasksRoute`
- `tests/api-integration/workspace-tasks.test.ts` (new)

The controller takes `(workspaceId, userId, { scope, limit }, now = new Date())` so
the deadline bucket is deterministic under test, mirroring `getWorkspaceSchedule`.

Verify: `pnpm --filter @maki/api test:integration -- workspace-tasks`

### Phase 2 — Web data layer

Files:

- `apps/web/src/fetchers/workspace/get-workspace-tasks.ts` (new)
- `apps/web/src/hooks/queries/workspace/use-workspace-tasks.ts` (new)

Query key `["projects", workspaceId, "tasks", scope]` so the existing task and
project mutations, which already invalidate the `projects` prefix, refresh the card.
`refetchInterval` of 30 s, disabled on an unauthorized error, matching
`use-workspace-schedule.ts` — the workspace home has no socket, so this interval is
what catches other members' edits and the overdue boundary passing.

Verify: `pnpm typecheck` (the Hono client infers the new route, so a wrong path or
param fails here).

### Phase 3 — Card and i18n

Files:

- `apps/web/src/components/charts/workspace-tasks.tsx` (new)
- `apps/web/src/routes/_layout/_authenticated/dashboard/workspace/$workspaceId/index.tsx`
- `i18n/en-US.json` and the 18 backfilled locales

The card reuses `ChartCard` and the existing `Tabs` primitives for the toggle, and
links each row to the same task detail route `workspace-schedule.tsx` already uses.
Skeleton and error states copy that component's shape.

Verify: `pnpm i18n:check` then `pnpm typecheck`.

### Phase 4 — Real proof

Browser pass on the workspace Dashboard: the card renders above the charts, a row
opens that task's detail page, the toggle switches scopes, and a member with no
assigned tasks sees the empty state rather than a blank card.

Verify: `pnpm exec biome check --write` on the touched files.

## Acceptance criteria

1. The workspace Dashboard shows a card above the charts listing up to 8 of my open tasks.
2. Rows are ordered overdue first, then nearest due date, then priority; undated last.
3. Clicking a row opens that task's detail page.
4. The `all` toggle lists every member's open tasks in the same order.
5. Tasks in final columns, archived projects, and other workspaces never appear.
6. An empty scope shows a message, not a blank card.
7. `showing N of M` appears when more tasks exist than the limit.
8. `mine` returns only tasks whose `assignee_id` equals the session user.

## Risks and limits

- The sort is an expression over open work, so it cannot use an index: Postgres
  sorts the matching set before `LIMIT`, and the uncapped `count(*)` scans the same
  scope a second time. This is the tradeoff `/schedule` already makes, so the
  dashboard's cost profile does not change shape — but it is a real cost on a very
  large workspace, not a free feature.
- `scope=all` exposes every task in the workspace, which is not a widening of
  access: project boards and `/schedule` already do. The `mine` filter is resolved
  from the session, never from client input.
- Cross-user updates lag up to 30 s. Instant delivery would need a workspace socket,
  which does not exist today.
- The i18n backfill writes the English wording into the other 18 locale files.

## Deferred

Dedicated paginated tasks page; one-click "Start" that mutates status (with its
reverse transition); assignee names in the `all` view; mounting on the project
Overview page; a saved filter preference; realtime push.

## Stop signals

Re-plan if the ordering query or the count query becomes visible in a slow query log
on a large workspace — the fix is to fold the count into the schedule response rather
than keep two endpoints — or if a workspace-wide socket lands, which makes the 30 s
interval redundant.

## Verification record

Ran and passed:

| Check | Command | Result |
| --- | --- | --- |
| API types | `pnpm --filter @maki/api typecheck` | clean |
| Web types | `pnpm --filter @maki/web typecheck` | clean |
| Formatting | `pnpm exec biome check <changed files>` | 11 files, no fixes |
| API unit tests | `pnpm --filter @maki/api test` | 57 files, 374 tests passed |
| Live contract | `GET /api/openapi` on the running dev API | `listWorkspaceTasks` registered at `/workspace/{workspaceId}/tasks`, 200 → `WorkspaceTaskList`, 401/403 declared; unauthenticated call returns 401 |
| SQL semantics | throwaway `postgres:16-alpine`, controller-level run | ordering, scoping, cap-without-capping-total, and per-user isolation all correct |

The SQL run confirmed, against real PostgreSQL 16.15: `mine` total 7 ordered
`[1,3,2,5,4,6,7]`; `all` total 9 ordered `[1,3,2,13,14,5,4,6,7]`; `limit: 3`
returned 3 rows with `total: 7`; a teammate's `mine` scope returned only their own
single task. Final-column, virtual-status (`planned`), archived-project, and
foreign-workspace tasks were excluded in every scope.

Not run, and why:

- **The committed integration test file did not execute in this checkout.**
  `apps/api/src/instrument.ts` imports `@sentry/profiling-node` at module scope, and
  the native binary `sentry_cpu_profiler.node` is not built for this machine. Every
  integration file that imports `createApp` therefore fails to load with `(0 test)` —
  28 of 38 files, including the untouched `workspace-schedule.test.ts`. The SQL
  behaviour above was verified instead by the same assertions run against the
  controller directly, which does not import `createApp`. `tests/api-integration/workspace-tasks.test.ts`
  is expected to run in CI, where the binary is present; it has not been observed
  passing anywhere yet.
- **`pnpm i18n:check` still exits non-zero**, but for keys unrelated to this plan:
  the working tree carries in-flight `navigation:announcementsPage.*` and
  `navigation:sidebar.announcements` entries in `en-US.json` whose translations are
  missing from the other locales. Zero `myTasks` keys are reported missing. Those
  announcements keys were deliberately left alone rather than backfilled, to keep
  this change reviewable.
- **No browser pass.** The repository has no Playwright or Cypress harness, so the
  click-through on the workspace Dashboard is left to the author.

