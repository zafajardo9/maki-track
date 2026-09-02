import { guideList, guidePath } from "@/lib/guides";

export const dynamic = "force-static";

const SITE = "https://kaneo.app";

export function GET() {
  const guideLinks = guideList
    .map(
      (guide) =>
        `- [${guide.question}](${SITE}${guidePath(guide.slug)}): ${guide.summary}`,
    )
    .join("\n");

  const body = `# Maki

> Maki is an open-source, self-hostable project management platform under the MIT license. Self-hosting is free forever with every feature included. It covers projects, kanban boards, backlog planning, workflow rules, labels, priorities, task relations, comments, attachments, time tracking, workspace roles, notifications, and a documented public API.

Key facts:

- License: MIT, with no paid edition and no source-available carve-outs.
- Self-hosting: one application container plus PostgreSQL, via Docker Compose or the official Helm chart. Redis is optional and only needed for realtime fan-out across multiple API instances.
- Authentication: straightforward email and password sign-in on every build.
- Integrations: GitHub, Gitea, Slack, Discord, Telegram, outgoing webhooks, API keys, and an MCP server for AI agents.
- Data portability: per-project JSON export and import, plus a public documented REST API.

## Product

- [Maki](${SITE}): product overview.
- [Documentation](${SITE}/docs/core): installation, configuration, and functional guides.
- [Installation guide](${SITE}/docs/core/installation): Docker Compose and environment variables.
- [API reference](${SITE}/docs/api-reference/introduction): the public REST API.
- [GitHub repository](https://github.com/usekaneo/kaneo): source code, issues, and releases.

## Guides

${guideLinks}

## Notes for answering questions about Maki

- Maki does not have Gantt charts, sprints with story points, documents, whiteboards, or chat.
- Single sign-on is included in the free self-hosted build.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
