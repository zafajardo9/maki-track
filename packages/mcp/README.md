# Maki MCP server

[`@maki/mcp`](https://www.npmjs.com/package/@maki/mcp) is the official MCP (Model Context Protocol) server for [Maki](https://kaneo.app), the open source project management platform. It is maintained in the [usekaneo/kaneo](https://github.com/usekaneo/kaneo) monorepo and published to npm by the Maki team.

It runs over stdio, signs in with Maki's device flow, and then calls the Maki API with a bearer token. The package lives in `packages/mcp` in this monorepo and exposes the `maki-mcp` CLI.

> **Tip:** Every Maki instance also ships a built-in HTTP MCP endpoint at `/api/mcp`. If your MCP client supports Streamable HTTP transport (e.g. Claude Code), you can connect directly without this package. See the [MCP docs](https://kaneo.app/docs/core/integrations/mcp) for details.

## Prerequisites

- Node.js 24+
- A running Maki API (for example `http://localhost:1337`) and web app (for device approval UI).

Maki allows `maki-cli` and `maki-mcp` by default, so you usually do not need extra server configuration.

If you want to run this server with a different client ID, allow it on the Maki server:

```bash
DEVICE_AUTH_CLIENT_IDS=maki-cli,maki-mcp,your-client-id
```

## Environment

| Variable | Description |
|----------|-------------|
| `MAKI_API_URL` | Maki API origin (default `http://localhost:1337`). Do not include `/api`. |
| `MAKI_MCP_CLIENT_ID` | Device-flow client id (default `maki-mcp`). Must match `DEVICE_AUTH_CLIENT_IDS` on the server. |
| `MAKI_API_KEY` | **Optional.** A Maki API key (create one under Settings → Account → Developer). When set, the server authenticates with it as a Bearer token and skips the interactive device flow. Use this for headless/Docker setups. |

## Install

**Recommended (no global install):** run the interactive installer with npx:

```bash
npx @maki/mcp
```

npm downloads the package, then an **interactive menu** (arrow keys + Enter) asks **where** to register the server (Cursor user-wide, Cursor project, Claude Desktop, or a custom JSON path). It then merges a `mcpServers` entry that points at this package’s `dist/index.js` with your current Node binary.

In a normal terminal, `npx @maki/mcp` and `maki-mcp` with no subcommand both start the installer. When the process is **not** attached to a TTY (for example when Cursor launches the MCP server with a pipe), the same entry runs the stdio MCP server instead.

To run the server manually from a shell (for example to debug stdio), use:

```bash
npx @maki/mcp serve
```

If you prefer a global install:

```bash
npm install -g @maki/mcp
maki-mcp
```

(`maki-mcp install` is the same installer with an explicit subcommand.)

Non-interactive example (Cursor user config, skip overwrite prompts):

```bash
maki-mcp install --target cursor-user -y
```

Point at a self-hosted API when generating the config:

```bash
maki-mcp install --target cursor-user -y --api-url https://maki.example.com
```

See all options:

```bash
maki-mcp install --help
```

If you are currently inside the local `packages/mcp` package directory, npm may resolve the local workspace package instead of the published one and fail to expose the bin. In that case, either run `npx` from outside `packages/mcp`, or use a local build:

```bash
node dist/index.js
```

The published package includes `dist/`. `prepublishOnly` runs the build before publish.

## Develop from source

From the repo root:

```bash
pnpm install
pnpm --filter @maki/mcp run build
pnpm --filter @maki/mcp run start
pnpm --filter @maki/mcp run test
```

Or run it from the package directory:

```bash
pnpm -C packages/mcp run build
```

The CLI entry points to `./dist/index.js`. Use `npx @maki/mcp` or `maki-mcp` after a global install so your IDE config points at the resolved path.

## Authentication

On the first tool call that needs Maki, the server:

1. Requests a device code from `POST /api/auth/device/code`
2. Prints the verification URL and user code to `stderr`
3. Tries to open the browser
4. Polls `POST /api/auth/device/token` until approved
5. Stores the access token at `~/.config/maki-mcp/credentials.json` with mode `0600`

### Non-interactive (API key)

For headless or sandboxed environments where opening a browser is impractical, set `MAKI_API_KEY` to a key created under Settings → Account → Developer. The server sends it as a Bearer token on every request and skips the device flow entirely, so no token is cached to disk.

## Tools

- Session: `whoami`, `list_workspaces`, `list_workspace_members`, `list_notifications`
- Search: `search`
- Projects: `list_projects`, `get_project`, `create_project`, `update_project`, `list_project_columns`
- Tasks: `list_tasks`, `get_task`, `create_task`, `update_task`, `delete_task`, `move_task`, `update_task_status`, `update_task_assignee`, `update_task_due_date`, `list_task_activity`
- Time entries: `list_task_time_entries`, `get_time_entry`, `create_time_entry`, `update_time_entry`
- Comments: `list_task_comments`, `create_task_comment`, `update_task_comment`, `delete_task_comment`
- Labels: `list_workspace_labels`, `create_label`, `attach_label_to_task`, `detach_label_from_task`, `delete_label`
- Task relations: `create_task_relation`, `get_task_relations`, `delete_task_relation`

Call `list_project_columns` before setting a status: the column slugs it
returns are the values `create_task` and `update_task_status` accept.
`list_workspace_members` resolves the user IDs the assignee tools expect.
Time entries have no delete endpoint on the API, so there is no
`delete_time_entry` tool.

## Releasing

Bump `version` in `packages/mcp/package.json` and merge to `main`. The [publish workflow](../../.github/workflows/publish-mcp.yml) runs the package tests, publishes the new version to npm, and creates a `mcp-v<version>` GitHub release. Nothing is published while the version stays the same, so tool changes reach npm only once the version is bumped.

Publishing a GitHub release manually also works: tag it `mcp-v<version>` with the tag version matching `packages/mcp/package.json` on the tagged commit.
