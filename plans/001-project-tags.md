# Plan 001 — Project tags (project-scoped labels)

Status: **implemented — phases 1–6 complete**
Verified: 2026-09-17
Date: 2026-09-16
Source: discovery conversation; decisions recorded below.

> Implementation was authorized in the exported session and completed in the
> takeover review. See the completion record below for verification and limits.

## Summary

Labels are workspace-wide: one palette shared by every project in the workspace.
Teams want a per-project vocabulary so each project's tasks can be organised around
that project's own workflow.

Add a second pool — **tags** — that behaves like labels (attach to tasks, filter,
colour, chips) but belongs to exactly one project. Tags and labels coexist; tags
never sync to GitHub or Gitea.

## Locked decisions

| Decision | Choice | Rejected alternative |
| --- | --- | --- |
| Model | One table, two scopes: `label` gains `project_id` | Separate `project_tag` + `task_tag` tables (duplicates ~10 call sites) |
| UI name | "Tags" for project-scoped, "Labels" unchanged for workspace | Calling both "labels" |
| Same name in both pools | Allowed; two distinct entries, tags listed first | Forbidding duplicates across scopes |
| API shape | New `/api/tag` route group over the shared table | Optional `projectId` on `/api/label` (would force dynamic, in-controller permission checks and break the `createRoute({ middleware })` convention) |
| Permissions | New `tag:*` statements; seeded broadly and editable per role | Reusing `label:*` (makes the two boundaries inseparable) |
| Seeded role defaults | `viewer` → `read`; `member`/`admin`/`owner` → full | Giving `viewer` create by default |
| Task moved to another project | Strip tag copies, keep workspace label copies, record activity | Blocking the move; auto-reattaching same-named tags in the destination |
| GitHub / Gitea | No sync for tags | Syncing tags as repo labels |

## Data model

`label` keeps its current dual role and gains a nullable project scope.

| Row kind | `task_id` | `project_id` | Uniqueness |
| --- | --- | --- | --- |
| Workspace palette | null | null | `(workspace_id, name)` where `task_id is null and project_id is null` |
| Workspace copy on a task | set | null | `(task_id, name)` where `project_id is null` |
| Tag palette | null | set | **new** `(project_id, name)` where `task_id is null and project_id is not null` |
| Tag copy on a task | set | set | `(task_id, name)` where `project_id is not null` |

Rules:

- A tag copy's `workspace_id` stays populated (the task's workspace) for parity with
  label copies and so existing workspace lookups keep working.
- Attaching copies `name`/`color` into a new row, exactly as labels do today. The
  palette row is never consumed, so a tag can be attached to many tasks.
- The UI only ever offers palette rows as attach candidates, so the API's latent
  "attaching a label that sits on another task moves it" path stays unused. Tag
  routes must add a scope check so a workspace label cannot be attached through a
  tag route, and vice versa.

### Index changes

In `apps/api/src/database/schema.ts`, on `labelTable`:

1. Add `projectId` — `text("project_id")`, FK to `projectTable.id`, `onDelete: "cascade"`, `onUpdate: "cascade"`.
2. Add `index("label_project_id_idx").on(table.projectId)`.
3. Narrow the existing `label_workspace_name_unique` partial index to
   `where(task_id is null and project_id is null)`.
4. Replace the global task/name constraint with separate partial unique indexes for workspace copies and tag copies (migration 0048).
5. Add `uniqueIndex("label_project_name_unique").on(table.projectId, table.name).where(task_id is null and project_id is not null)`.

### Cascade rules must become scope-aware

`updateLabel` and `deleteLabel` currently cascade on `(workspace_id, name)`, which
would rename or delete a project tag that merely shares a name with a workspace
label. Both must derive scope from the row itself:

- Row has `projectId` → match `project_id = <row>.project_id`.
- Row has no `projectId` → match `project_id is null`.

`getLabelsByWorkspaceId` must add `project_id is null`, otherwise tags leak into the
workspace Labels settings page and every bulk toolbar that lists workspace labels.

## Permissions

`packages/permissions/src/index.ts`:

- `statement` gains `tag: ["create", "read", "update", "delete"]`.
- `viewer` gains `tag: ["read"]`; `member`, `admin`, `owner` gain all four.
- `defaultRolePayloads` derives from role statements, so it updates automatically.

Enforcement on the new routes uses the existing helpers —
`requireWorkspacePermission({ tag: ["create"] })` plus `workspaceAccess.fromBody`,
`fromProject`, or `fromLabel`.

**Existing installs need a backfill.** Custom roles live as JSON payloads in
`workspace_role`, seeded from `defaultRolePayloads`; rows created before this change
have no `tag` key, so the Roles UI would show nothing to toggle. Add
`apps/api/src/utils/migrate-workspace-role-tag-statements.ts` and call it from
`runStartupTasks()` in `apps/api/src/index.ts`. The backfill must be **additive
only** — never remove or rewrite permissions an admin has edited.

## API surface

New route group `apps/api/src/tag/` (`index.ts`, `schema.ts`, `response.ts`,
`controllers/`), mounted in `apps/api/src/index.ts` next to `label`.

| Method | Path | Middleware | Purpose |
| --- | --- | --- | --- |
| GET | `/api/tag/project/{projectId}` | `workspaceAccess.fromProject("projectId")` | List a project's tag rows (palette + copies), mirroring the workspace labels endpoint |
| POST | `/api/tag` | `workspaceAccess.fromProject("projectId")` + `tag:create` | Create a palette tag |
| PUT | `/api/tag/{id}` | `workspaceAccess.fromLabel()` + `tag:update` | Rename/recolour, cascading within the project |
| DELETE | `/api/tag/{id}` | `workspaceAccess.fromLabel()` + `tag:delete` | Delete palette tag + its copies in the project |
| PUT | `/api/tag/{id}/task` | `workspaceAccess.fromLabel()` + `tag:update` | Attach a tag to a task |
| DELETE | `/api/tag/{id}/task` | `workspaceAccess.fromLabel()` + `tag:update` | Detach a tag |

Task payloads already include label rows, so tag chips need no new read path;
`GET /api/label/task/{taskId}` returns both scopes and the client splits them.

## Web surfaces

| Area | File |
| --- | --- |
| Project settings tab | new `apps/web/src/routes/_layout/_authenticated/dashboard/settings/projects/$projectId/tags.tsx` |
| Project settings nav | `apps/web/src/routes/_layout/_authenticated/dashboard/settings/projects.tsx` (`menuItems` + segment) |
| Tag API client | new `apps/web/src/fetchers/tag/`, `hooks/queries/tag/`, `hooks/mutations/tag/` |
| Dedupe helper | `apps/web/src/lib/get-task-label-options.ts` — key by scope, not name |
| Picker | `apps/web/src/components/task/task-labels-popover.tsx` — Tags and Labels sections |
| Chips | `apps/web/src/components/kanban-board/task-labels.tsx`, `components/public-project/public-task-labels.tsx` |
| Bulk toolbars | `apps/web/src/components/bulk-selection/bulk-toolbar.tsx`, `backlog-bulk-toolbar.tsx` |
| Create-task modal | `apps/web/src/components/shared/modals/create-task-modal.tsx` |
| Filters | board/backlog filter menus, `apps/web/src/hooks/use-task-filters-with-labels-support.ts` (matching is already id-based; only the menu needs tag entries) |
| Capabilities | `apps/web/src/hooks/use-workspace-permission.ts` — add `createTags`/`updateTags`/`deleteTags` |
| Copy | `i18n/en-US.json` (source of truth), then `pnpm i18n:check` |

## Phases

### Phase 1 — Schema and migration *(recommended start)*

- **Goal:** the table can hold both scopes without weakening either one's constraints.
- **Steps:** schema changes above → generate migration → inspect SQL → adjust
  `getLabelsByWorkspaceId`.
- **Files:** `apps/api/src/database/schema.ts`, `apps/api/src/label/controllers/get-labels-by-workspace-id.ts`, generated file in `apps/api/drizzle/`.
- **Command:** `pnpm --filter @maki/api db:generate`
- **Tests:** new `tests/api-integration/tag.test.ts` — per-project uniqueness; the
  same name in both scopes; workspace list excludes tags.
- **Verify:** `pnpm --filter @maki/api test:integration`
- **Reversible:** yes (additive column + index swap).
- **Stop if:** rebuilding `label_workspace_name_unique` needs a write lock that is
  unacceptable for a large live table. Drizzle migrations run in a transaction, so
  `CREATE INDEX CONCURRENTLY` needs a separate, non-transactional migration.

### Phase 2 — Tag domain logic and routes

- **Goal:** tags are creatable, listable, renamable, deletable and attachable, with
  scope-correct cascades.
- **Steps:** make `updateLabel`/`deleteLabel` scope-aware; add the `apps/api/src/tag/`
  route group and controllers reusing the label controllers where the logic is
  identical; enforce the scope check on attach/detach in both directions; strip tag
  copies in `apps/api/src/task/controllers/move-task.ts` and record activity;
  publish events on tag changes.
- **Tests:** extend `tests/api-integration/tag.test.ts`; keep `tests/api-integration/label.test.ts`
  and `label-detach.test.ts` green (regression guard for scope-aware cascades).
- **Verify:** `pnpm --filter @maki/api test:integration`
- **Reversible:** yes — new routes, no data rewrite.
- **Stop if:** sharing controllers starts changing workspace-label behavior.

### Phase 3 — Permissions and backfill

- **Goal:** tags are authorised through the permission system and editable per role,
  including on existing installs.
- **Steps:** statements + built-in roles; new backfill utility wired into
  `runStartupTasks()`; apply tag middleware to the new routes.
- **Tests:** backfill is additive and idempotent; a role without `tag:create`
  receives 403 and the UI hides the affordance.
- **Verify:** `pnpm --filter @maki/api test:integration && pnpm --filter @maki/api typecheck`
- **Stop if:** the backfill cannot merge without clobbering custom role edits.

### Phase 4 — Project settings Tags tab

- **Goal:** a project's tags can be managed in the UI by anyone with the permission.
- **Steps:** mirror `settings/workspace/labels.tsx`; add the nav entry; capability-gate
  create/edit/delete; add fetchers, query and mutation hooks.
- **Files:** routes/fetchers/hooks above; `routeTree.gen.ts` regenerates automatically.
- **Verify:** `pnpm --filter @maki/web typecheck` plus a component test for the tab.
- **Reversible:** yes (UI only).

### Phase 5 — Task surfaces

- **Goal:** tags appear everywhere labels do, without regressing labels.
- **Steps:** make the dedupe helper scope-aware (this is the risky change — it is the
  reason call sites merge by name today); update every call site listed above; add
  Tags/Labels sections to the picker and filter menus; add i18n keys.
- **Verify:** `pnpm i18n:check && pnpm --filter @maki/web test && pnpm --filter @maki/web typecheck`
- **Stop if:** dedupe changes start altering existing workspace-label rendering —
  revert to name-based merging for labels only and re-scope the change.
- **Reversible:** yes.

### Phase 6 — MCP and docs

- **Goal:** agents can work with tags and the two pools are documented.
- **Steps:** add `list_project_tags`, `create_tag`, `attach_tag_to_task`,
  `detach_tag_from_task`, `delete_tag` in `apps/api/src/mcp/tools.ts`, mirroring the
  label tools; document the pools in `apps/docs` and the glossary in `ARCHITECTURE.md`.
- **Verify:** `pnpm --filter @maki/api typecheck` and the docs build.

## Acceptance criteria

1. A member creates tag `bug` in project A → it appears in A's pickers and A's project
   settings, and never in project B or the workspace Labels page.
2. Workspace label `bug` and project tag `bug` coexist; a task can hold both; both
   chips render; filtering by either id returns exactly the right tasks.
3. Renaming a tag cascades to its copies inside that project only; the workspace label
   of the same name and its copies are untouched — and the reverse holds.
4. Deleting the workspace label `bug` leaves project tag `bug` and its copies intact —
   and the reverse holds.
5. Moving a task from project A to B strips its A tags, keeps its workspace labels, and
   records the removal in activity.
6. Deleting project A deletes its tags and tag copies; workspace labels are unaffected.
7. A role without `tag:create` sees no create affordance and receives 403 from the API.
8. After migration, an existing install's custom roles expose tag permissions in the
   Roles UI, with their earlier custom edits intact.

## Risks

| Risk | Mitigation |
| --- | --- |
| Backfill clobbers admin-edited role payloads | Additive merge only, idempotent, integration-tested |
| Name-based dedupe in ~6 call sites silently hides a chip | Centralise scope-aware dedupe first, then migrate call sites in one phase |
| Index rebuild locks a large `label` table | Inspect generated SQL; fall back to a separate non-transactional migration |
| `getLabelsByWorkspaceId` leaking tags | Explicit `project_id is null` filter with a test |
| Two scopes in one table drift apart over time | Keep controllers shared; revisit a split only if tags gain their own lifecycle |

## Open questions (proceeding on these defaults)

| Question | Default we will proceed with |
| --- | --- |
| Visual distinction between tags and labels on task cards | None — same chip style, tags first; distinction only as section headings inside the picker and filter menus |
| Should MCP be able to delete a palette tag? | Yes — the blast radius is one project, unlike workspace labels which stay blocked |
| Should the project Tags tab also list workspace labels read-only? | No — keep the boundary clean and the page single-purpose |
| Index strategy | Standard migration first; a separate non-transactional index migration only if the table is large |

## Approval

- [x] Spec and phases 1–6 approved
- [x] Recommended first slice (phases 1–3) approved to start
- [x] Open questions above accepted or corrected


## Completion record — 2026-09-17

All six phases are implemented. The takeover review completed the interrupted
same-name picker work and fixed additional scope boundaries:

- Same-named tags and labels can be attached, detached, displayed, and filtered
  independently; tags display first. Creating a workspace label is no longer
  blocked by a same-named tag.
- Label rename/delete and bulk endpoints cannot mutate tags through label
  permissions. Bulk label removal preserves tag copies.
- GitHub and Gitea import lookups exclude tags; Gitea reconciliation cannot delete
  or recolor them, including when the provider has no labels.
- Palette create/update/delete events use the existing project broadcast adapter
  and invalidate client palettes and task copies. Moving tasks refreshes both
  project tag queries and the moved task's label query.
- Create-task tag selection respects tag-update permission and clears tags from
  a previously selected project. The role backfill uses a conditional update to
  avoid overwriting concurrent permission edits.
- Database relations, task response metadata, MCP HTTP tools, documentation,
  static i18n keys, and migrations 0047/0048 are included.

Verification:

- Web suite: 244 passing tests, including same-name picker/chips/filter tests and
  remote tag cache invalidation.
- API unit suite: 374 passing tests, including project-scoped event delivery.
  Two MCP URL tests failed during the concurrent repository run, then passed in
  isolation and in the complete API unit rerun.
- Full integration suite: 264 passing tests and one pre-existing failure in
  `comment.test.ts:93`, which references the absent `schema.commentTable`.
- Expanded tag integration suite: 34/34 passing, covering scope enforcement, provider imports,
  project cascades, moves, dual assignments, and additive/idempotent role backfill.
  Migrations were also applied to a fresh local `maki_tags_verify_test` database.
- Repository typecheck, production build, direct site build, and i18n check pass.
- Changed source files pass targeted Biome checks. Generated Drizzle JSON retains
  the generator's formatting (the journal triggers Biome's tab-format preference).

No production database was used. No commit or push was made. A manual browser
walkthrough and live Redis multi-instance run were not performed; component,
API integration, and in-memory event delivery tests provide the automated proof.

## Backend audit and compact cards — 2026-09-17

Follow-up regression tests reproduced and fixed these gaps:

- Duplicate tag renames return HTTP 409 instead of an internal server error.
- Attaching an assigned tag copies it without deleting the source assignment.
- Tag assignment locks the task before validating its project, preventing stale
  source-project tags during concurrent moves.
- Empty and whitespace-only tag names are rejected.
- Bulk label removal rejects labels from another workspace.
- Palette deletion and deletion of task copies commit or roll back together.
- Task moves and tag-removal activity commit together; overlapping moves return
  HTTP 409 rather than silently overwriting each other.
- Startup migration/backfill is verified twice with an existing custom role.
- The obsolete comment-table assertion now verifies migration 0045 removed the
  legacy table, resolving the earlier integration failure noted above.

Task cards render assigned tags and labels as compact 18px chips with 10px text,
small color dots, truncated names, and full names on hover. Tags appear first;
the existing Show labels preference is respected. Empty cards have no label gap.
The real chip component was visually checked in an isolated fixture at desktop
and mobile widths without changing live task data; the fixture was removed.

Follow-up verification: 263 web tests, 374 API unit tests, 48 focused integration
tests, repository typecheck, and the final web typecheck pass. Live Redis
multi-instance verification remains outside this local audit.

Final full API integration rerun: **37 files / 279 tests pass**, against the local
`maki_tags_verify_test` PostgreSQL database. An initial attempt could not connect
because Docker had stopped; restarting the existing local test container resolved
that environment failure. Targeted Biome checks and `git diff --check` pass.
