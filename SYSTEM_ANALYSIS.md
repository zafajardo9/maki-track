# Maki — System Analysis

**Document purpose.** A factual system documentation report intended to be handed to
another AI or reviewer to build a company systems portfolio entry for this product.

**Analysis metadata**

| Field | Value |
| --- | --- |
| Repository | `maki` (formerly/also published as "kaneo") |
| Version at analysis | `2.22.0` (`package.json`, `CHANGELOG.md`) |
| Analysis date | 2026-09-21 |
| Scope | Entire monorepo: `apps/*`, `packages/*`, `charts/*`, `tests/*`, `i18n/*`, `.github/workflows/*`, root documentation |
| Tree state | Committed `v2.22.0` **plus** uncommitted work in the working tree |
| Artifact | This document is the only file added by the analysis; the analysis itself changed nothing |

**Evidence rules used.** Everything below is drawn from files in the repository. No
secret values were read or reproduced — only environment-variable *names* appear.
Claims that could not be verified in code are marked **Not confirmed from codebase**.
Every capability is labelled **Implemented**, **Partially implemented**,
**Planned / placeholder**, or **Deprecated / unused**.

---

## 1. System Name

**Maki** — introduced as "a fast, deliberately simple, self-hosted project-management
platform" (`README.md`, `ARCHITECTURE.md` §1).

Evidence of legacy naming: the repository, container images
(`ghcr.io/usekaneo/kaneo`), and several code/assets still use the former name
**kaneo** (`apps/docs/index.mdx`, `i18n/schema.json` `$id: https://kaneo.app/...`,
`apps/web/src/components/demo-alert.tsx`). The product name and the artifact
namespace therefore do not yet match.

## 2. System Overview

Maki is a self-hosted project-management platform for planning and tracking work. An
organisation runs it on its own server, and its people open it in a browser. Work is
organised as **workspaces** (the boundary for membership and permissions), which
contain **projects** (task containers), and projects contain **tasks** laid out on
kanban columns. Tasks carry owners, priorities, due dates, comments, attachments,
labels, tags, relationships to other tasks, and tracked time.

The system is delivered as web application, API, and database. It also exposes a
documented REST API and a built-in **MCP server**, so scripts, integrations, and AI
assistants can read and change the same data the interface shows. Outside tools
connect in both directions: GitHub/Gitea for code and issues, and Slack, Discord,
Telegram, ntfy, Gotify, and generic webhooks for outbound notifications.

It is intended for teams that want control of their data and a deliberately
uncluttered tool: engineering and product teams, small organisations, and privacy- or
compliance-sensitive operators who prefer to host their own software. The problem it
solves is twofold — project tools that are too heavy to keep a team focused, and
tools whose data lives with a vendor rather than the organisation. Maki keeps the
feature set small enough to stay out of the way and small enough to self-host as one
container plus PostgreSQL.

## 3. Primary Purpose

The main goal is to provide complete, dependable project execution — plan, assign,
track, discuss, and report — while remaining simple to understand, fast in daily use,
and straightforward to self-host.

The repository states the design principles explicitly (`AGENTS.md`,
`ARCHITECTURE.md` §1): simplicity is a product requirement, the API is the sole
authority for security, single-instance self-hosting is first-class, and every change
to state must be traced through its notification, activity, integration, and realtime
surfaces. The system exists because the authors judged existing tools to be
over-featured and the alternatives hard to operate privately.

## 4. Target Users / User Roles

| Role | What they can do | Evidence |
| --- | --- | --- |
| **Instance administrator** | First registered user is promoted to instance admin; bypasses workspace permission checks entirely | `apps/api/src/auth.ts` (first-user promotion under an advisory lock), `apps/api/src/utils/is-instance-admin.ts`, `packages/permissions` resolution order |
| **Workspace owner** | Full control of a workspace: all project actions plus `workspace:delete`, ownership transfer, billing management | `packages/permissions/src/index.ts` (`owner` role), `apps/api/src/utils/project-access.ts` |
| **Workspace admin** | All project actions including sharing, `access_all`, `manage_access`; can edit roles and manage billing | same |
| **Workspace member** | Create/read/update tasks, manage labels and tags, comment, attach files | `packages/permissions/src/index.ts` (`member`) |
| **Workspace viewer** | Read-only: `project:read`, `task:read`, `label:read`, `tag:read` | same (`viewer`) |
| **Custom role holders** | Any permission subset an admin defines; up to 25 roles per workspace | `workspace_role` table, `apps/web/src/routes/.../settings/workspace/roles.tsx`, `apps/api/src/auth.ts` (`dynamicAccessControl`) |
| **Explicit project member** | Access to a specific project whose access mode is "restricted" without workspace-wide access | `project_member` table, `apps/api/src/utils/project-access.ts` |
| **API key holder / automation** | Programmatic access scoped to the key's own permissions | `apps/api/src/auth.ts` (api-key plugin), `apps/api/src/utils/require-workspace-permission.ts` |
| **AI / MCP client** | Drives projects, tasks, comments, labels, tags, relations, time entries and search through 41 MCP tools, authenticated by OAuth device flow | `apps/api/src/mcp/tools.ts`, `packages/mcp` |
| **Anonymous public viewer** | Read-only view of a project explicitly published as public | `apps/api/src/index.ts` (`/api/public-project/:id`, `/api/asset/{id}`), `apps/web/src/routes/public-project.$projectId.tsx` |
| **Self-hosting operator** | Not an in-app role: installs and configures the instance | `apps/docs/core/installation/*`, `charts/maki/README.md` |

## 5. Core Features

### Implemented Features

| Feature | What it does | Main user benefit |
| --- | --- | --- |
| Workspaces, projects, columns | Membership/authorization boundary → task containers → status lanes; project slugs prefix task IDs (`KAN-12`) | One place for a team, many boards inside it |
| Task management | Create, edit, move, assign, prioritise, set start/due dates, archive, plan, bulk-update | Track work without ceremony |
| Board / backlog / calendar / Gantt views | Kanban with drag-and-drop, backlog with bulk planning, due-date calendar, timeline Gantt | Choose how to see the same work |
| Rich task description | TipTap editor with markdown, code blocks, tables, task lists, images, embeds, file attachments | Express requirements properly |
| Comments & activity log | Comment threads plus durable, human-readable history of every change | Discussion stays next to the work |
| Labels (workspace) & tags (project) | Two coloured marker pools sharing one table, with cascade and sync rules | Categorise across projects or within one |
| Task relations & subtasks | Typed links: subtask, blocks, related | Model dependencies |
| Search | Ranked search across tasks, projects, workspaces, comments, activities; understands short IDs like `DEP-23` | Find work without browsing |
| Project files view | Read-only repository of files uploaded to a project's tasks, with search by filename/task/uploader, type filter, sorting, totals | Find shared documents quickly |
| Real-time updates | Event bus → WebSockets; client invalidates the affected caches | Boards converge without refresh |
| Notifications | In-app notifications plus email, ntfy, Gotify and signed webhooks, with per-event and per-workspace rules | Stay informed on the channels you choose |
| Workspace roles & permissions | Per-workspace editable roles over a canonical permission vocabulary | Fine-grained access control |
| Project access control | "workspace" vs "restricted" projects with explicit members | Restrict sensitive projects |
| Public project sharing | Read-only public board with its own theme toggle and progress summary | Show progress without a licence |
| Members & invitations | Invite by email or link, pending-invitation management, ownership transfer | Grow a team |
| GitHub / Gitea integration | Link project to repository, import issues as tasks, mirror issues/comments, rules that move tasks on webhook events | Code work and planning stay aligned |
| Slack / Discord / Telegram / webhook notifications | Per-project, per-event outbound delivery with a due-date reminder schedule | Notify where the team already is |
| File storage & avatars | Signed direct-to-storage uploads, private streaming delivery, automatic orphan cleanup; avatars stored in-database | Attach files without proxying bytes |
| Task import/export | Per-project JSON export and import with per-task results | Move data in and out |
| Public REST API + OpenAPI | ~166 documented operations, typed client, API keys | Integrate anything |
| MCP server | 41 tools over streamable HTTP and a modern stateless mode, plus a published stdio package | Let AI assistants operate the platform |
| Billing & entitlements (cloud mode) | Creem-backed plans, trials, seat reconciliation, entitlement gating | Commercial hosting |
| Scheduler | Postgres-permissioned cron jobs: due-date reminders, webhook reminders, seat reconciliation, trial reminders | Reliable automation |
| Localisation | 18 locales with a strict parity check in CI | Use the product in your language |
| Keyboard-first UX | Command palette, sequential shortcuts, shortcut help, global search menu, mobile navigation | Speed for power users |
| Deployment surfaces | Bundle image, separate API/web images, Compose, Coolify, Helm chart, drim installer, Railway template | Run it your way |

### Partially Implemented Features

| Feature | What exists | What appears missing |
| --- | --- | --- |
| **Time tracking** | Full REST API (`/api/time-entry/*`) and MCP tools; duration backfill migration (`0043`) | **No UI at all.** The web fetchers, hooks and types exist but nothing imports them; `README.md` nevertheless advertises "time tracking" |
| **Project files** | Listing, filtering, sorting, search, totals, page | Only files already attached inside tasks appear; there is no project-level upload, and document *contents* are not searchable (metadata only) |
| **Search** | `ILIKE` + `CASE` scoring, short-ID lookup, escaped patterns | No full-text index, no stemming, no semantic search; activity/content search only for descriptions and comments |
| **Localisation** | 18 locales, CI parity gate, generated schema | 279–389 strings per non-English locale are still English; ~48 locale keys are unused; ~10 UI surfaces are hardcoded English (MCP consent, device pages, billing, mobile nav, demo banner) |
| **Teams** | `team` / `team_member` tables wired into the auth adapter, limited to 10 per workspace | No Maki controller, fetcher, or UI reads or writes them — dormant schema |
| **Billing** | Complete Creem integration, entitlements, seat sync, trial reminders | Cloud-only (`MAKI_CLOUD` + Creem keys); inert on self-hosted installs; billing UI copy is hardcoded English |
| **Announcements** | A workspace page rendering a static list from `constants/announcements.ts` | Not backed by data; authored in code |
| **Demo mode** | `DEMO_MODE` exposed through the public config endpoint | No enforcement anywhere in API or web — appears inert |

Uncommitted work in progress at analysis time (present on disk, not yet committed):
project access modes and explicit project members (new tables, endpoints, migration
`0049`, UI, tests), the project Files view, announcement copy, and
notification/task-relation refactors.

### Planned / Placeholder Features

- `plans/` holds two implementation plans (project tags; workspace top-tasks queue),
  both recorded as **Implemented** in `plans/README.md`.
- Only two `TODO` comments exist in the web app:
  `components/team/members-table.tsx` ("That UI lives in workspace settings (TODO)")
  and `components/team/invite-team-member-modal.tsx` ("TODO: role and email"). No
  `TODO`/`FIXME`/`HACK` markers exist in `apps/api/src`.
- Debug surface shipped without a guard: `/test-error` renders a hardcoded error page
  referencing an example external host (`apps/web/src/components/ui/error-test.tsx`).
- Blank route: `/dashboard/settings` renders its chrome with no index route, so the
  content pane is empty at that URL.
- Duplicated route pair: `_authenticated/invitations.tsx` and
  `dashboard/invitations.tsx` render near-identical tables.

### Deprecated / Unused

- Dormant schema retained for library compatibility: `team`, `team_member`,
  `invitation.team_id`, `session.active_team_id`.
- Historically removed tables (no longer in schema): `comment` and `github_integration`
  (migrations `0032`, `0045`), plus `user.is_anonymous`.
- Legacy API-key column kept as a fallback: `apikey.user_id` superseded by
  `apikey.reference_id`.
- Unused web modules: the entire time-entry vertical, `settings-layout.tsx`,
  `team/delete-team-member-modal.tsx`, `ui/error-fallback.tsx`, `tanstack/router.tsx`,
  unused query/mutation hooks, `lib/status.tsx`, `lib/format-duration.ts`,
  `types/api-response.ts`.
- Unused UI primitives never imported: slider, menubar, meter, pagination,
  toggle-group, fieldset, group, checkbox-group, combobox.
- Unused API exports: `requireProjectEntitlement`, `isReminderDue`, `listPlugins`.
- Duplicated (dead) MCP route registration in `apps/api/src/mcp/index.ts`.
- Unused dependencies: `cmdk`, `react-use-websocket`, both devtools packages, and
  roughly 19 `@radix-ui/react-*` packages.
- Legacy "kaneo" naming in three places (URLs constant, demo banner, i18n schema `$id`).

## 6. Main User Flow

**A. Delivery team member (most common)**
Sign up → first user becomes instance admin → onboarding creates a workspace → create
a project (columns are seeded) → board: create a task → work it: drag between columns,
assign, prioritise, set due date, write a description with attachments, comment, link
related tasks, log time via API/MCP → realtime updates and notifications keep the team
aligned → project overview reports progress.

**B. Workspace administrator**
Create workspace → invite members by email or link → define or adjust roles in
workspace settings → configure projects (visibility, access mode, workflow columns,
automations, integrations) → connect GitHub/Gitea and chat channels → manage billing
and seats (cloud) → monitor members.

**C. Developer or AI agent**
Create an API key (or approve a device-authorisation code) → call the REST API or MCP
tools → create/update tasks, comment, search, move work → changes appear in the UI in
realtime.

**D. Anonymous stakeholder**
Open a public project link → read-only kanban/list with progress summary → open a task
for detail → no account required.

**E. Self-hosting operator**
Install via drim, Compose, Helm or Coolify → supply required configuration
(`MAKI_CLIENT_URL`, `AUTH_SECRET`, database, optional storage/email/integrations) →
migrations run automatically at startup → upgrade by pinning a new image tag.

## 7. Main Modules / Areas

| Module | Responsibility |
| --- | --- |
| Authentication | Sessions, password reset, API keys, device authorisation, instance admin bootstrap |
| Onboarding & invitations | First-run workspace creation, profile setup, invitation accept/decline |
| Workspaces | Membership, roles, ownership transfer, workspace deletion |
| Projects | Creation, ordering, archiving, visibility, access modes, explicit members |
| Work items | Tasks, columns, board ordering, priorities, due dates, bulk operations |
| Board views | Kanban, list, backlog, calendar, Gantt, overview charts |
| Task detail | Description editor, properties, subtasks, relations, external links |
| Activity & comments | Durable history and discussion |
| Files & assets | Upload, storage, authorization, cleanup, project repository view |
| Notifications | In-app plus email/ntfy/Gotify/webhook delivery and preferences |
| Search | Cross-entity ranked search |
| Integrations | GitHub, Gitea, Slack, Discord, Telegram, generic webhooks, workflow rules |
| Extensibility | REST API, OpenAPI spec, API keys, MCP server (HTTP + stdio) |
| Billing | Plans, trials, seats, entitlements (cloud only) |
| Administration | Workspace/project settings, roles, labels, tags, workflow, integrations |
| Public sharing | Unauthenticated read-only project publication |
| Realtime | Event bus, WebSocket hub, optional Redis fan-out |
| Background jobs | Scheduler with leader lock and idempotency records |
| Deployment | Docker images, Compose, Helm chart, entrypoint automation |

## 8. Technology Stack

### Frontend

React 19 + Vite 8, TypeScript, Tailwind CSS 4 (CSS-first, no Tailwind config),
TanStack Router (file-based, generated route tree) and TanStack Query for server
state, Zustand for client state, Base UI primitives via the coss registry (with
residual Radix in two files), TipTap 3 editor, dnd-kit drag-and-drop, framer-motion,
hand-rolled SVG/CSS charts (no chart library), react-hook-form + Zod, i18next.

### Backend

Node.js ≥ 24, Hono 4 with `@hono/zod-openapi` for validated, self-documenting routes;
`@hono/node-server` and `@hono/node-ws`; Better Auth 1.6 for authentication and
organisation/role handling; an in-process event bus; a croner-based scheduler guarded
by a Postgres leader lock; Sentry for error tracking; esbuild bundling.

### Database

PostgreSQL with Drizzle ORM. Schema in `apps/api/src/database/schema.ts` (36 tables),
relations in `relations.ts`, migrations in `apps/api/drizzle/` (50 migrations) applied
automatically at startup together with several imperative legacy-repair migrations.
Notably uses partial unique indexes for the dual-purpose `label` table, composite
foreign keys carrying `workspace_id` for tenant integrity, and CHECK constraints for
project access mode.

### Infrastructure / Hosting

Docker multi-stage images (bundled API+web+nginx, or separate API and web images),
Docker Compose (three variants: production, Coolify, local), a Helm chart with
Ingress/Gateway API/HPA and bundled-or-external PostgreSQL, and GitHub Actions for CI,
nightly verification, image publication and releases. Redis is optional and used only
to fan out WebSocket broadcasts across API replicas. Confirmed hosting targets in
docs: Docker Compose, Coolify, Kubernetes/Helm, Railway template, separate containers
behind your own proxy, and a `drim` CLI installer.

### Important Libraries

`@hono/zod-openapi` (route contracts + spec), Drizzle ORM/Kit, Better Auth (+ api-key,
device-authorization, admin, organization plugins), `@modelcontextprotocol/sdk`,
ioredis, `@paralleldrive/cuid2` (IDs), bcryptjs (password hashing), `creem` (billing),
Sentry SDKs, `croner`, TipTap, TanStack Router/Query, `@base-ui/react`, Vitest +
Testing Library, Biome, Turbo.

## 9. External Integrations

| Integration | Purpose | Direction | Status |
| --- | --- | --- | --- |
| **Creem** | Subscription billing, checkout, customer portal, webhooks | Outbound API + inbound signed webhook | Implemented, cloud-only (`MAKI_CLOUD` + Creem keys) |
| **ImageKit** | Object storage for task images/attachments; signed upload and signed private delivery | Outbound (bytes go browser→provider directly) | Implemented; uploads return 503 when unconfigured |
| **Resend** | Transactional email: password reset, invitations, notification emails | Outbound | Implemented; skips when unconfigured |
| **GitHub (App)** | Repo linking, issue import, issue/comment mirroring, webhook events | Inbound webhook + outbound API | Implemented; requires GitHub App credentials |
| **Gitea** | Same as GitHub for self-hosted Gitea, using a personal token | Inbound webhook + outbound API | Implemented |
| **Slack** | Per-project incoming-webhook notifications | Outbound only | Implemented |
| **Discord** | Per-project webhook notifications | Outbound only | Implemented |
| **Telegram** | Bot-token notifications to chat/topic | Outbound only | Implemented |
| **Generic webhook** | Signed outbound POST of selected events; due-date reminders | Outbound | Implemented, with an SSRF guard that can be relaxed by an env flag |
| **ntfy / Gotify** | Self-hosted push notification channels | Outbound | Implemented (per-user channels) |
| **Cloudflare Turnstile** | Bot protection on signup | Outbound verification | Implemented, enforced only in cloud mode |
| **Sentry** | Error tracking, tracing, session replay, cron check-ins | Outbound (opt-in) | Implemented; disabled when DSNs unset |
| **Redis** | WebSocket broadcast fan-out across API instances | Internal infrastructure | Implemented; optional |
| **MCP clients** | AI assistants/CLI operating the platform | Inbound HTTP + outbound stdio package | Implemented with OAuth 2.1 authorization server |
| **Plausible** | Analytics for the documentation site | Outbound | Configured in `apps/docs/docs.json` |

No AI model provider (LLM/embedding service) is integrated — **Not confirmed from
codebase**. Analytics for the marketing site is **not confirmed from codebase**.

## 10. Data & Main Entities

- **Identity**: `user`, `session` (carries the active workspace), `account`
  (credentials), `verification`, `user_avatar` (bytes in-database), `apikey`,
  `device_code`.
- **Workspace & membership**: `workspace` (top-level authorization boundary),
  `workspace_member` (user↔workspace + role name), `invitation`, `project_member`
  (explicit access to restricted projects), plus `team`/`team_member` which are
  declared for the auth library but unused by product code.
- **Permissions**: `workspace_role` — a per-workspace role name mapped to a serialized
  permission payload; viewer/member/admin are seeded here, owner stays static.
- **Work items**: `project` (container, slug, ordering, visibility, access mode, task
  counter) → `column` (status lane, one flagged final) → `task` (the central entity:
  status slug, priority, dates, assignee, creator, column). Around it: `task_relation`
  (directed subtask/blocks/related edges), `label` (one table serving workspace labels,
  project tags, and per-task copies, discriminated by nullability and enforced with
  partial unique indexes), `time_entry`, `activity` (both comments and system history,
  plus imported external comments), and `external_link` (task ↔ GitHub/Gitea
  issue/PR/branch).
- **Notifications**: `notification`, `user_notification_preference` (channels),
  `user_notification_workspace_rule` + `user_notification_workspace_project`
  (per-workspace overrides and selected projects), `task_reminder_sent` (dedup).
- **Integrations**: `integration` (per-project typed JSON config: GitHub, Gitea,
  Slack, Discord, Telegram, webhook), `workflow_rule` (integration event → target
  column).
- **Assets**: `asset` — uploaded files scoped to workspace/project/task/activity with
  object-store key, MIME type, size, kind and surface.
- **Billing**: `workspace_billing`, `trial_grant`, `billing_event` (webhook
  idempotency), `billing_reminder_sent`.
- **Operations**: `job_lease` (single-runner election for scheduled jobs).
- **MCP**: `mcp_oauth_state` (short-lived OAuth client/code/request state).

Relationship shape: a workspace owns projects, members, roles, invitations and
workspace-level labels; a project owns columns, tasks, tags, integrations, workflow
rules and explicit members; a task owns its activity, time entries, attachments,
label/tag copies and relations. Deletes cascade down the ownership chain, while
attribution fields (assignee, time-entry author, activity author, asset creator) are
`SET NULL` so history survives user deletion. Enumerations such as task status,
priority, notification type and integration type are application-level strings, not
database enums.

## 11. Authentication & Permissions

**Authentication** — Better Auth with a Drizzle/PostgreSQL adapter at `/api/auth`,
using bcrypt password hashing. Enabled: email+password with reset, bearer session
tokens, API keys (`x-api-key`, 100 requests/60 s), OAuth device authorisation for
CLI/MCP clients, instance-admin plugin, organisation plugin, and OpenAPI registration.

**Not enabled**: social/OAuth login providers, two-factor authentication, passkeys, and
SSO. **Not confirmed from codebase** as planned.

Sessions last 30 days and slide after one day of age; sensitive account operations
require a session fresher than 24 hours; a 5-minute cookie cache reduces session
lookups. Cookie attributes adapt to deployment: `SameSite=None` + `secure` +
partitioned only for a cross-subdomain HTTPS setup, otherwise `Lax`.

**Authorization** — a canonical vocabulary in `packages/permissions` (`project`,
`task`, `label`, `tag`, `workspace` resources with per-resource actions). Four
built-in roles: owner (static), and viewer/member/admin that are seeded per workspace
as editable `workspace_role` rows (max 25 per workspace). Enforcement happens in the
API through `requireWorkspacePermission`, which resolves API-key scope → instance
admin → workspace membership → custom role row → compiled-in default. Workspace-scoped
routes additionally resolve and validate the workspace through `workspaceAccess.*`
middleware variants (project, task, label, comment, column, activity, time entry,
workflow rule). Project-level access is a second, data-level gate: instance admins see
everything, owners/admins or `project:access_all` see all workspace projects,
otherwise a project must be workspace-mode or list the user as an explicit member.
Asset downloads apply the same rules with one deliberate exception: assets of projects
marked public are readable without credentials.

**Protected areas** — everything except explicitly public routes: health, instance
status, public project JSON, public invitation lookup, asset/avatar streaming,
OpenAPI, config, GitHub/Gitea webhooks, billing webhook, MCP well-known documents, and
auth endpoints. The UI gates actions with capability flags fetched from the server,
but the API is the authority.

## 12. Deployment & CI/CD

**Configuration present:** a bundled multi-stage Dockerfile (API + web + nginx, with
an entrypoint that derives URLs, derives the database URL, generates an ephemeral auth
secret when unset, runs runtime placeholder substitution, waits for the health
endpoint, and propagates child exits), separate API and web Dockerfiles, three Compose
files (production, Coolify, local dev with Postgres/API/web/docs), a Helm chart
(Deployment, Service, optional bundled PostgreSQL Deployment+PVC, HPA, Ingress or
Gateway API HTTPRoute, service account, render-time validation guards, no Secret
template and no Redis or storage configuration), and 15 GitHub Actions workflows.

**CI/CD automation:** CI runs Biome check, i18n parity, typecheck, unit tests, build,
PostgreSQL-backed integration tests against a `postgres:16` service, and a Docker build
smoke test. Nightly re-runs verification and publishes nightly images. A reusable
workflow builds and pushes three multi-arch images. Helm validation lints and renders
six value permutations. The release workflow is dispatch-only from `main` and
deliberately ordered: resolve version from Conventional Commits → build and push
images from a version-stamped tree → validate the chart → cut the release (version
files, changelog, tag, GitHub Release with PR-collapsed notes, "released in vX.Y.Z"
comments) → promote `:latest` → publish the chart. Additional workflows publish the
MCP and PLANKA-import packages to npm with provenance, deploy the marketing site to
GitHub Pages, notify Discord, auto-assign issues, auto-merge Dependabot
patches/minors, and refresh contributors.

**Classification: Mature for build/validate/publish automation; Partially implemented
for delivery operations.** The artifact pipeline is unusually thorough for a project
of this size — version stamping, chart gating, dry-run, PR-mapped changelog notes, and
manual release dispatch are all implemented. What keeps it out of a clean "Mature"
verdict:

- **No continuous deployment** to any environment. Production rollout is
  operator-driven (`docker compose pull`, `helm upgrade`, `drim upgrade`).
- **No staging environment** is defined in the repository.
- **No automated database backup, restore, or PITR** tooling; backups are documented
  guidance only, and the Helm chart states the need rather than implementing it. No
  Helm lifecycle hooks exist.
- **No rollback path for the schema.** Migrations are forward-only with no down
  migrations, so rolling an image back does not roll back the database; the documented
  rollback path covers compose/Caddyfile files, not data. The security policy states
  fixes land only on the latest release.

## 13. Testing & Quality

| Area | Finding |
| --- | --- |
| API unit tests | 58 files in `tests/api`, executed in this analysis: **380 tests passing** (Vitest, mocked dependencies) |
| API integration tests | 40 files in `tests/api-integration`, requiring a real PostgreSQL database whose name ends in `_test`; not executed here (no database available) |
| Web tests | 63 files colocated with source, executed in this analysis: **295 tests passing** (Vitest + Testing Library, jsdom) |
| Package tests | 19 test files across `packages/*` (permissions, libs, email, MCP, PLANKA import) |
| Type checking | Yes — strict TypeScript, plus a mandatory `tsc --noEmit` job in CI and two web project configs |
| Linting / formatting | Biome, enforced in CI in check-only mode; pre-commit hook runs `biome ci`; Conventional Commits enforced by commitlint + husky |
| Validation | Zod on every API input via route contracts; response schemas registered as OpenAPI components |
| Error handling | Central error handler mapping `HTTPException` to status codes, Sentry capture for 5xx, retries/idempotency in scheduler and billing, graceful shutdown on signals |
| Translation quality gate | Locale parity check in CI, including CLDR plural categories |
| Coverage | **No coverage data available.** Coverage is explicitly disabled in both API and web Vitest configs and no thresholds are configured |
| End-to-end / browser tests | **None found** — no Playwright, Cypress, or equivalent configuration or workflow |
| Performance/load tests | **Not found** — no load-test tooling or benchmarks |
| Contract tests between web and API | Only compile-time: the web app imports the API's inferred `AppType`, so a breaking contract fails typecheck |

**Assessment:** the automated process is strong on breadth — unit,
integration-against-real-database, type, lint, i18n, build and container checks all run
in CI, and the tests target meaningful behaviour (authorization boundaries, RBAC,
RBAC-with-custom-roles, migrations, CORS, device auth, MCP OAuth, billing/seat/trial
logic). The weakest areas are the top of the pyramid: no end-to-end or browser
verification of real user flows, no coverage measurement or gating, no performance
testing, and the translation-usage reporter is not wired into CI. No exact coverage
percentage can be stated because none exists.

## 14. Security

**Implemented**

- Authentication via Better Auth with database-backed, revocable, httpOnly-cookie
  sessions; sliding expiry with a freshness window for sensitive changes; bearer
  tokens for API clients.
- API keys with their own scope and rate limit; device-authorisation flow restricted
  to an allow-list of client IDs.
- Authorization enforced server-side with a canonical permission vocabulary, editable
  per-workspace roles, workspace-scoped access resolution, and a separate project-level
  access gate. Instance admins bypass checks by design.
- Input validation on every documented endpoint through Zod route contracts, with a
  uniform 400 response; ID-lookups deliberately read the identifier only from where
  the handler reads it, closing an authorize-one-act-on-another class of bug.
- Tenant isolation reinforced in the schema with composite foreign keys carrying
  `workspace_id` and cascade rules along the ownership chain.
- SSRF protection for outbound webhooks via a public-destination assertion, relaxable
  only by an explicit environment flag.
- Secrets at rest: notification channel tokens and webhook secrets are encrypted with
  AES using a dedicated key (`enc:v1:` prefix); an earlier plaintext migration
  explicitly nulls unencrypted legacy values.
- Transport/cookie hardening: adaptive `SameSite`/`secure`/`partitioned` attributes;
  nginx in the shipped images sets `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`.
- Content safety on downloads: assets are served with a safe inline allow-list (images
  only), everything else as an attachment with `nosniff`, and private files stream
  through short-lived signed URLs.
- CORS restricted to configured origins in production, with a deliberate, documented
  development-only reflection mode.
- WebSocket authorization re-checked per message delivery, with revocation closing the
  socket.
- Error tracking configured with `sendDefaultPii: false`.
- Repository hygiene: no credentials are committed; all secrets arrive through
  environment variables. A security policy with private disclosure and a
  supported-version stance is present.
- Bootstrap integrity: the first user's promotion to instance admin is serialised
  under a PostgreSQL advisory lock.

**Gaps supported by the code**

- **No multi-factor authentication, passkeys, or SSO** are enabled.
- **Rate limiting is conditional.** Global auth rate limiting is enabled only when the
  cloud flag is set; self-hosted instances opt in rather than being protected by
  default. Signup and several abuse controls (disposable-email blocking, CAPTCHA
  enforcement) are also cloud-gated.
- **No Content-Security-Policy** is set in the shipped nginx configuration or by the
  API; security headers exist only where nginx serves the app, so a separately
  deployed API fronted by another proxy inherits none.
- **No centralised administrative audit log.** Activity history is task-scoped and
  user-visible; it is not an operator-facing trail of administrative actions.
- **A debug route ships in production** (`/test-error`) with no environment guard.
- The Helm chart ships a default database password and relies on a render-time
  validation to force operators to change it; there is no Secret template and no
  secret-manager integration.
- No request-size limits, IP allow-listing, or WAF configuration were found in the
  repository.

No credential values are reproduced anywhere in this report.

## 15. Current Development State

**Active Development.** The project is past prototype stage and is genuinely released:
version `2.22.0`, a substantive CHANGELOG and published container images, a Helm chart
at matching version, a public documentation site, a marketing site, and a commercial
cloud tier with billing, trials and seat management.

The evidence for "active" rather than "stabilisation" or "maintenance":

- A large body of uncommitted work in progress at the time of analysis (project access
  modes and explicit project members including a new table, endpoints, migration and
  tests; the project Files view; notification and task-relation refactors).
- Ongoing schema evolution — 50 migrations, with the most recent adding tables and
  constraints.
- Substantial unused/leftover code from iterative development (a complete
  time-tracking vertical with no UI, ~10 unused UI primitives, unused
  hooks/libraries/dependencies, duplicated MCP route registration).
- Documentation drift showing fast-moving features (documented language count, Helm
  values, and reverse-proxy guidance that no longer match the code).
- Feature-flagged behaviour that is exposed but not enforced (demo mode), and a dormant
  schema area (teams) retained for library compatibility.

## 16. How Complete Is the System?

| Area | Score |
| --- | ---: |
| Core Functionality | 26/30 |
| UI/UX | 12/15 |
| Backend & Integrations | 13/15 |
| Testing & Reliability | 10/15 |
| Deployment & Operations | 7/10 |
| Security | 7/10 |
| Documentation | 4/5 |
| TOTAL | **79/100** |

### Why it is at this percentage

The core product is broad and coherent: workspaces, projects, boards, backlog,
calendar, Gantt, task detail with a rich editor, comments, a durable activity log, two
marker pools, relations, search, realtime updates, notifications across five channels,
editable roles, project access control, public sharing, file storage with cleanup,
import/export, six integrations, a documentation-grade REST API, and a 41-tool MCP
server. The backend carries unusually disciplined engineering for this class of product
— routed permissions middleware, Zod contracts with OpenAPI metadata, event-driven
activity/notification/realtime fan-out, scheduler jobs with a leader lock and
idempotency tables, encrypted integration secrets, SSRF guarding, and tenant integrity
enforced by composite foreign keys. The delivery pipeline is well above average:
multi-arch images, chart validation across value permutations, nightly verification,
ordered release gating, and changelog notes mapped back to pull requests.

### What prevents it from being 100%

- **Time tracking is unreachable in the product** while being advertised in the
  README; the API and MCP tools exist with no interface.
- **Testing stops short of end-to-end.** No browser tests, no coverage measurement or
  thresholds, no performance testing, so regression protection for real user flows is
  absent.
- **Operational safety net is incomplete:** no automated backups, restore drills or
  PITR, no staging environment, no continuous deployment, and forward-only migrations
  with no rollback path for data.
- **Security floor is uneven:** no MFA/SSO/passkeys, rate limiting only when the cloud
  flag is set, no CSP, and a debug route shipped unguarded.
- **Localisation is incomplete** in practice: hundreds of strings per locale remain
  English and several surfaces are hardcoded.
- **Documentation and repository hygiene drift:** the LICENSE and CONTRIBUTING files
  referenced by the README are absent at the repository root, the documented language
  count and some chart values no longer match the code, and the generated i18n schema
  is stale.
- **Dead and duplicated code** (duplicate MCP route registration, unused exports, ~20
  unused dependencies, unused primitives, dormant teams tables) raises maintenance
  cost.

## 17. Remaining Work

### High Priority

1. Resolve the uncommitted in-flight work — land it or park it — so the repository is
   releasable and the working tree describes the product.
2. Ship the time-tracking interface or remove the claim from `README.md`; an advertised
   feature with no UI is the largest credibility gap.
3. Establish a data-safety baseline: automated database backup (and a documented
   restore drill), plus a documented upgrade/rollback procedure that acknowledges
   forward-only migrations.
4. Remove or guard the `/test-error` debug route.
5. Restore documentation correctness: provide the root `LICENSE` and `CONTRIBUTING.md`
   that the README references, correct the locale count, chart values and
   reverse-proxy guidance, and regenerate `i18n/schema.json`.

### Medium Priority

6. Add end-to-end browser tests for the critical flows (sign in, create project,
   create and move a task, comment and attach, invite a member, public share link) and
   enable coverage reporting with a threshold gate.
7. Complete localisation: translate the hardcoded surfaces (MCP consent, device pages,
   billing, mobile navigation, demo banner), backfill the untranslated strings, and
   prune unused keys.
8. Make rate limiting default-on for self-hosted instances, or document the trade-off
   prominently; add a Content-Security-Policy at the serving layer.
9. Clean up dead code and unused dependencies, and decide the fate of the dormant
   `team`/`team_member` schema.
10. Change or remove the default database password in the Helm chart in favour of a
    generated secret.

### Nice to Have

11. Improve search with a PostgreSQL full-text index (and optional semantic ranking) if
    content discovery becomes a priority.
12. Add project-level file uploads so the file repository is not limited to task
    attachments.
13. Publish the docs site reproducibly (it has no package manifest or workflow) and
    provision Sentry alerts/dashboards automatically rather than by hand.
14. Add load/performance testing for large boards, the stated performance-sensitive
    path.

## 18. Recommended Next Steps

1. **Land or park the in-flight work.** Commit, document and verify the project-access
   model, files view, and notification/relation refactors so the release pipeline
   (which reads `main`) matches the product.
2. **Either build the time-tracking UI or drop the feature from the README.** The API,
   MCP tools and migration already exist; the missing piece is a surface.
3. **Automate database backup and restore.** Add a scheduled `pg_dump` (or document
   provider PITR), a Helm pre-upgrade hook, and a tested restore procedure; state
   plainly that schema migrations are forward-only.
4. **Introduce a Playwright smoke suite** covering authentication, task lifecycle,
   comments/attachments, invitations and the public share page, wired into CI as a
   required job.
5. **Turn on coverage measurement** with an enforced threshold on the API and web
   packages, and wire `pnpm i18n:report` into CI to catch hardcoded and unused keys.
6. **Fix the documentation drift in one pass:** add the missing root `LICENSE` and
   `CONTRIBUTING.md`, correct the language count (18, not 20), align the Helm chart
   README with the values that actually exist, update the nginx guide to the
   single-container layout, and regenerate the i18n schema.
7. **Raise the security floor:** enable rate limiting unless explicitly disabled, add a
   CSP at the nginx layer, and remove the shipped debug route.
8. **Delete dead code and dependencies** — the duplicated MCP route registration,
   unused exports, unused UI primitives, unused hooks and libraries, and ~20 unused
   packages — then decide whether teams are wired into the product or removed.
9. **Finish localisation of the ten hardcoded surfaces** and backfill the per-locale
   untranslated strings flagged by the reporter.
10. **Kick off scoping for the next functional increment** — most plausibly
    project-level file uploads (completing the file repository) — before adding breadth
    elsewhere.

## 19. Short Portfolio Description

Maki is a self-hosted project-management platform that gives a team planning,
execution, and reporting in a single application they own. Work is organised into
workspaces containing projects, each with boards, backlogs, calendars, and timelines
over tasks that carry owners, priorities, dates, comments, attachments, labels, tags,
and dependencies. Teams see each other's changes immediately, receive notifications on
the channels they prefer, control access with editable per-workspace roles and
restricted projects, and can publish a read-only link for stakeholders. A documented
REST API and a built-in MCP server let scripts and AI assistants work with the same
data. It connects to GitHub or Gitea for code and issue sync, and to Slack, Discord,
Telegram, ntfy, Gotify, or custom webhooks for alerts. It ships as a container
alongside PostgreSQL, with Docker Compose, Kubernetes, and hosted deployment paths.
Maki is a mature, actively developed product: full release automation, multi-architecture
images, a validated Helm chart, and broad automated testing, with remaining work
concentrated in end-to-end testing, operational backup and rollback tooling,
localisation completeness, and a few advertised features still awaiting their
interface.

## 20. Evidence Reviewed

- Root documentation: `README.md`, `ARCHITECTURE.md`, `AGENTS.md`,
  `ENVIRONMENT_SETUP.md`, `SECURITY.md`, `CHANGELOG.md`, `plans/`
- Build and tooling configuration: `package.json`, `pnpm-workspace.yaml`, `turbo.json`,
  `biome.json`, `tsconfig` base, `commitlint.config.js`
- API: `apps/api/src/index.ts`, `auth.ts`, `auth-openapi.ts`, `openapi.ts`,
  `database/schema.ts`, `database/relations.ts`, `database/index.ts`, `events/`, `ws/`,
  `redis/`, `scheduler/`, `billing/`, `mcp/`, `search/`, `storage/`, `utils/`, all
  per-feature `*/index.ts` routers
- API migrations: `apps/api/drizzle/` (50 migrations + journal),
  `apps/api/src/migrations/`
- Database-facing configuration: `apps/api/drizzle.config.ts`,
  `apps/api/vitest.config.ts`, `apps/api/vitest.integration.config.ts`
- Web: `apps/web/package.json`, `vite.config.ts`, `src/routeTree.gen.ts`,
  `src/routes/**`, `src/components/**`, `src/hooks/use-project-websocket.ts`,
  `src/hooks/use-user-websocket.ts`, `src/hooks/use-workspace-permission.ts`,
  `src/lib/i18n/`, `src/store/`
- Shared packages: `packages/permissions/`, `packages/libs/`, `packages/mcp/`,
  `packages/email/`, `packages/planka-import/`
- Localisation: `i18n/en-US.json`, the 18 locale files, `i18n/resources.ts`,
  `i18n/schema.json`, `scripts/i18n/`
- Deployment: `Dockerfile.maki`, `apps/api/Dockerfile`, `apps/web/Dockerfile`,
  `deploy/maki-entrypoint.sh`, `apps/web/nginx.conf`, `apps/web/nginx.maki.conf`,
  `apps/web/env.sh`, `compose.yml`, `compose.coolify.yml`, `compose.local.yml`,
  `charts/maki/`
- CI/CD: `.github/workflows/` (15 workflows), `.github/dependabot.yml`,
  `scripts/release/`, `sentry/`
- Tests: `tests/api/`, `tests/api-integration/`
- Product documentation: `apps/docs/docs.json` and the 98 MDX pages under
  `apps/docs/`; `apps/site/` marketing site
- Working-tree state: `git status` (77 modified paths plus untracked in-flight work)

---

## Compact Summary

```text
SYSTEM SUMMARY

Name: Maki (legacy artifact namespace: kaneo)
Purpose: Fast, deliberately simple, self-hosted project management — plan, execute,
         and report on work while keeping the data and the deployment in the team's
         own hands.
Primary Users: Delivery teams and individuals (members, viewers, admins, owners);
         workspace custom-role holders; instance administrators; API-key holders and
         AI/MCP clients; anonymous public-project viewers; self-hosting operators.
Current Status: Active Development — released (v2.22.0) and production-installable,
         with a substantial body of uncommitted in-flight feature work.
Completion Estimate: 79/100
Main Features: Workspaces/projects/columns/tasks; board, backlog, calendar and Gantt
         views; rich task editor with attachments; comments and durable activity log;
         workspace labels and project tags; task relations and subtasks; ranked search;
         project files repository; realtime WebSocket updates; notifications over
         in-app/email/ntfy/Gotify/webhooks; editable workspace roles; project access
         control; public read-only sharing; task import/export; REST API + OpenAPI;
         41-tool MCP server; cloud billing with trials and seat management.
Main Integrations: Creem (billing), ImageKit (storage), Resend (email), GitHub App and
         Gitea (code/issue sync), Slack, Discord, Telegram, generic webhooks, ntfy,
         Gotify, Cloudflare Turnstile, Sentry, optional Redis; MCP clients.
Deployment Maturity: Mature build/release automation (multi-arch images, chart
         validation, nightly, ordered manual release) but Partially implemented
         operations — no CD, no staging, no automated backup/restore, forward-only
         migrations with no data rollback.
Testing Maturity: Strong breadth, weak top of the pyramid. 380 API unit tests and
         295 web tests pass; 40 PostgreSQL-backed integration test files exist;
         typecheck, lint, i18n and container checks gate CI. No end-to-end/browser
         tests, no coverage measurement or thresholds, no load tests.
Biggest Remaining Gaps: No UI for the advertised time-tracking feature; no end-to-end
         or coverage-gated testing; no automated backup, restore or rollback path;
         conditional rate limiting, no MFA/SSO, no CSP; incomplete localisation with
         hardcoded surfaces; missing root LICENSE/CONTRIBUTING and document drift;
         notable dead code, duplicated MCP route registration and ~20 unused
         dependencies; uncommitted in-flight work.
Recommended Immediate Priority: Land or park the uncommitted in-flight work so the
         repository and release pipeline describe the real product, then establish the
         data-safety baseline (automated backup plus a documented restore/upgrade
         procedure) and resolve the time-tracking feature's missing interface.
```
