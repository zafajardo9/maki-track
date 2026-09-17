# Project Tags — Implementation Reference

Companion to [001-project-tags.md](001-project-tags.md) (the plan). This document
describes how the feature is actually wired in the codebase, as verified on
2026-09-17. User-facing behavior is documented separately in
`apps/docs/core/functional/manage-project-tags.mdx`.

## Core idea

Tags are not a separate table. The existing `label` table holds **two scopes in
one table**, discriminated by the nullable `project_id` column:

- `project_id IS NULL` → workspace label (existing behavior, unchanged)
- `project_id IS NOT NULL` → project tag (new)

Both scopes keep the pre-existing "palette row + per-task copy" pattern: a
palette row (`task_id IS NULL`) defines the name/color, and attaching copies
`name`/`color` into a new row with `task_id` set. Tag copies also keep
`workspace_id` populated so existing workspace-scoped lookups keep working.

### Row kinds in `label`

| Row kind | `task_id` | `project_id` | Uniqueness index |
| --- | --- | --- | --- |
| Workspace palette | null | null | `label_workspace_name_unique` on `(workspace_id, name)` where `task_id is null and project_id is null` |
| Workspace copy on task | set | null | `label_task_name_unique` on `(task_id, name)` where `project_id is null` |
| Tag palette | null | set | `label_project_name_unique` on `(project_id, name)` where `task_id is null and project_id is not null` |
| Tag copy on task | set | set | `label_task_tag_name_unique` on `(task_id, name)` where `project_id is not null` |

Because task-level uniqueness is per scope, one task can hold a workspace label
`bug` **and** a project tag `bug` simultaneously.

Schema: `apps/api/src/database/schema.ts` (`labelTable`, ~line 633). The
`projectId` FK references `projectTable.id` with `onDelete: "cascade"`, so
deleting a project removes its tag palettes and copies automatically.
Relations are declared in `apps/api/src/database/relations.ts`.

### Migrations

- `apps/api/drizzle/0047_chubby_lady_bullseye.sql` — adds `project_id` column +
  FK + `label_project_id_idx`, rebuilds `label_workspace_name_unique` with the
  narrowed `project_id is null` predicate, adds `label_project_name_unique`.
- `apps/api/drizzle/0048_marvelous_thunderball.sql` — drops the old global
  `(task_id, name)` constraint and replaces it with the two per-scope partial
  unique indexes.

## Scope-aware cascades (the critical invariant)

`updateLabel` and `deleteLabel` in `apps/api/src/label/controllers/` are shared
by both scopes. Both take a `scope: "label" | "tag"` parameter (default
`"label"`) and **reject rows from the wrong scope** with 400:

```ts
if (Boolean(label.projectId) !== (scope === "tag")) throw 400
```

Their cascades derive the scope from the row itself, never from the name alone:

- Palette rename/recolor cascades to copies matching `(workspace_id, name,
  task_id is not null)` **plus** `project_id = <row>.project_id` when the row is
  a tag, or `project_id is null` when it is a workspace label.
- Palette delete collects and deletes copies under the same scope-aware
  predicate, using the row returned by `DELETE` (not the earlier read) so a
  concurrent rename cannot widen the blast radius.
- `deleteLabel` only calls `removeLabelFromGitHub` / `removeLabelFromGitea` for
  copies with `project_id === null` — tags never sync to providers.
- `updateLabel` maps PostgreSQL `23505` unique violations to a 409 so a
  same-name collision inside one scope is a client-visible conflict.

`getLabelsByWorkspaceId` (`apps/api/src/label/controllers/get-labels-by-workspace-id.ts`)
filters `isNull(labelTable.projectId)` so tags never leak into the workspace
Labels settings page or workspace-level bulk toolbars.

## API surface — `/api/tag`

Route group `apps/api/src/tag/`, mounted as `api.route("/tag", tag)` in
`apps/api/src/index.ts` (line ~586) and included in the typed-client union.
Follows the standard convention: `createRoute` from `@hono/zod-openapi`,
request schemas in `schema.ts`, response schemas in `response.ts`
(`tagSchema.openapi("Tag")`), thin handlers delegating to controllers.

| Method | Path | Middleware | Controller |
| --- | --- | --- | --- |
| GET | `/api/tag/project/{projectId}` | `workspaceAccess.fromProject("projectId")` | `get-tags-by-project-id.ts` — all rows with `project_id = :projectId` (palette + copies) |
| POST | `/api/tag` | `fromProject("projectId")` + `tag:create` | `create-tag.ts` |
| PUT | `/api/tag/{id}` | `fromLabel()` + `tag:update` | `update-tag.ts` |
| DELETE | `/api/tag/{id}` | `fromLabel()` + `tag:delete` | `delete-tag.ts` |
| PUT | `/api/tag/{id}/task` | `fromLabel()` + `tag:update` | `assign-tag-to-task.ts` |
| DELETE | `/api/tag/{id}/task` | `fromLabel()` + `tag:update` | `unassign-tag-from-task.ts` |

Controller notes:

- **create** — resolves the project for its `workspaceId`, inserts the palette
  row with `onConflictDoNothing` on the tag-palette partial index, then
  re-selects (idempotent create). Publishes `project.tags_changed` only when a
  row was actually inserted.
- **update / delete** — verify the row exists and `projectId` is set (else 400
  "Not a project tag"), then delegate to the shared scope-aware
  `updateLabel(id, name, color, "tag")` / `deleteLabel(id, userId, "tag")` and
  publish `project.tags_changed`.
- **assign** — runs in a transaction with two deliberate locks: `SELECT … FOR
  UPDATE` on the task (so a concurrent move cannot strip tags after the project
  check) and `FOR SHARE` on the source row (so a concurrent rename/delete of
  the palette stays stable until the copy commits). Validates same project +
  same workspace, then **always inserts a copy** with `onConflictDoNothing` on
  the tag-copy partial index — it never moves an already-assigned row off
  another task. Publishes `task.label_assigned` only when a copy was inserted.
- **unassign** — validates the row is a tag and is task-scoped, deletes by id,
  publishes `task.label_unassigned`. Comment in the file: tags never sync to
  GitHub/Gitea, so no provider calls.

There is no separate "get tags for task" endpoint: `GET
/api/label/task/{taskId}` returns both scopes and the client splits them by
`projectId`.

## Permissions

`packages/permissions/src/index.ts`:

- `statement` gains `tag: ["create", "read", "update", "delete"]`.
- Built-in roles: `viewer` → `tag: ["read"]`; `member`, `admin`, `owner` → all
  four. `defaultRolePayloads` derives from these, so new installs seed
  correctly.

**Backfill for existing installs**:
`apps/api/src/utils/migrate-workspace-role-tag-statements.ts`, called from
`runStartupTasks()` in `apps/api/src/index.ts` (after
`seedDefaultWorkspaceRoles()`). Properties:

- Additive only: skips rows that already have a `tag` key; preserves every
  other key byte-for-byte; skips malformed JSON.
- Only default role names (`viewer`/`member`/`admin`/`owner`) get the implicit
  grant; custom roles stay deny-by-default until an admin opts in.
- Idempotent: a second run updates nothing.
- Race-safe: the UPDATE's WHERE clause includes the previously read
  `permission` payload (compare-and-swap), so a concurrent admin edit is never
  overwritten — the row is simply skipped.

Enforcement on routes uses the standard `requireWorkspacePermission({ tag: [...] })`
helper; a missing `tag` key in a role payload means denied.

## Events and realtime

- New event type `project.tags_changed` (`{ projectId }`), published by tag
  create/update/delete. `publishEvent` in `apps/api/src/events/index.ts` is
  string-typed, so no registry change was needed.
- `apps/api/src/ws/index.ts` subscribes and calls
  `broadcastToProject(projectId, { type: "PROJECT_TAGS_UPDATED", projectId })`
  — the existing project broadcast adapter, so Redis multi-instance fan-out
  works unchanged.
- Web: `apps/web/src/hooks/use-project-websocket.ts` handles
  `PROJECT_TAGS_UPDATED` by invalidating `["tags", projectId]` and
  `["tasks", projectId]` (palette + rendered chips).
- Attach/detach reuse the existing `task.label_assigned` /
  `task.label_unassigned` events, so activity, notifications, and task-query
  invalidation behave exactly as for labels.

## Task move behavior

`apps/api/src/task/controllers/move-task.ts`: inside the move transaction, tag
copies (`task_id = :taskId AND project_id = :sourceProjectId`) are selected,
deleted, and one `label_unassigned` activity row per stripped tag is inserted
(`eventData` carries `labelName`, `labelColor`, `fromProjectId`). Workspace
label copies (`project_id IS NULL`) are untouched and travel with the task.
The row lock in `assign-tag-to-task.ts` exists specifically to serialize
against this strip.

## Provider integrations (GitHub / Gitea)

Tags are excluded everywhere by scope:

- `deleteLabel` skips provider removal for rows with `project_id !== null`.
- GitHub/Gitea import lookups and Gitea reconciliation filter to
  `project_id is null` rows, so imports cannot match, recolor, or delete tags —
  including when the provider has no labels at all.
- Gitea webhook `issue-labeled` handling is scope-aware for the same reason.

## Web implementation

| Piece | Location |
| --- | --- |
| Typed fetchers (via `@maki/libs` client) | `apps/web/src/fetchers/tag/` (6 files, one per endpoint) |
| Query hook | `hooks/queries/tag/use-get-tags-by-project.ts` — `queryKey: ["tags", projectId]` |
| Mutation hooks | `hooks/mutations/tag/` (5 files) |
| Settings tab route | `routes/_layout/_authenticated/dashboard/settings/projects/$projectId/tags.tsx` → `components/project/project-tags-settings.tsx` |
| Settings nav entry | `routes/_layout/_authenticated/dashboard/settings/projects.tsx` (`segment: "tags"`) |
| Scope-aware dedupe | `lib/get-task-label-options.ts` — keys options by `"tag:"` / `"label:"` prefix + name so a same-named tag never hides a label; palette row wins over a copy within one scope |
| Picker | `components/task/task-labels-popover.tsx` — separate Tags and Labels sections, tags first |
| Chips | `components/kanban-board/task-labels.tsx`, `components/public-project/public-task-labels.tsx` — same chip style, tags render first |
| Bulk toolbars | `components/bulk-selection/bulk-toolbar.tsx`, `backlog-bulk-toolbar.tsx` |
| Create-task modal | `components/shared/modals/create-task-modal.tsx` — tag selection respects `tag:update` and clears tags when the selected project changes |
| Filters | board/backlog filter menus + `hooks/use-task-filters-with-labels-support.ts` (matching is id-based; only menus needed tag entries) |
| Capability flags | `hooks/use-workspace-permission.ts` — `createTags`/`updateTags`/`deleteTags` → `canCreateTags()` etc. |
| Copy | `i18n/en-US.json` is the source of truth; `pnpm i18n:check` passes |

## MCP

`apps/api/src/mcp/tools.ts` registers five tools that call the same HTTP API
through the typed client: `list_project_tags`, `create_tag`,
`attach_tag_to_task`, `detach_tag_from_task`, `delete_tag`. Unlike workspace
labels, palette tags are deletable via MCP (blast radius is one project). The
published stdio package in `packages/mcp` picks these up from the server.

## Tests

- `tests/api-integration/tag.test.ts` (~1330 lines, 34 tests): per-project
  uniqueness, same name in both scopes, scope enforcement on every route,
  cross-project attach rejection, cascades, project delete cascade, task move
  stripping, provider import/reconciliation exclusion, additive + idempotent
  role backfill.
- `tests/api-integration/label.test.ts` and `label-detach.test.ts` stay green
  as the regression guard for the scope-aware cascade changes.
- Web: `components/project/project-tags-settings.test.tsx`,
  `hooks/use-project-websocket-tags.test.tsx`, plus same-name picker/chips/
  filter tests (244 web tests total per the completion record).

## Invariants to preserve when touching this code

1. **Every** query, cascade, or mutation on `label` must be scope-aware:
   derive scope from the row's `project_id`, never match on `(workspace_id,
   name)` alone.
2. The `scope` parameter on `updateLabel`/`deleteLabel` is a security
   boundary — it stops label-permission holders from mutating tags and vice
   versa. Keep the 400 scope check first in both.
3. Attach always copies; never re-home an assigned row.
4. Provider sync paths must keep the `project_id === null` guard.
5. New tag mutations must publish `project.tags_changed` (palette changes) or
   the `task.label_*` events (copy changes) so realtime and activity stay
   correct.
6. The role backfill must stay additive, idempotent, and compare-and-swap.
