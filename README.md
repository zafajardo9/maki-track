# Maki

Maki is a fast, deliberately simple, self-hosted project-management platform. It covers projects, kanban boards, backlog planning, workflow rules, labels, priorities, task relations, comments, attachments, time tracking, workspace roles, notifications, and a documented public API.

- **Clean interface** that focuses on your work, not the tool
- **Self-hosted** so your data stays yours
- **Fast**, with performance and realtime updates taken seriously
- **Open source** under the permissive MIT license

## Quick start (Docker Compose)

```bash
cp .env.sample .env
# Set POSTGRES_PASSWORD and AUTH_SECRET (openssl rand -hex 32), and uncomment MAKI_CLIENT_URL=http://localhost:5173
docker compose up -d
```

Open [http://localhost:5173](http://localhost:5173). See [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md) for the full environment-variable reference and troubleshooting.

## Deployment

- **Kubernetes** — official Helm chart in [charts/maki](charts/maki/README.md)
- **Coolify** — use the bundled [compose.coolify.yml](compose.coolify.yml)
- **Separate services** — the API and web images can be deployed independently (`apps/api/Dockerfile`, `apps/web/Dockerfile`)

## Development

See [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md), then:

```bash
pnpm install
pnpm dev
```

## MCP server

Every instance ships a built-in MCP endpoint at `/api/mcp`. For stdio clients, use the official `@maki/mcp` npm package:

```bash
npx -y @maki/mcp
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT — see [LICENSE](LICENSE).
