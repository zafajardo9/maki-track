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

> Maki is a project management platform built for teams to plan, collaborate, and track delivery. It covers projects, kanban boards, backlog planning, workflow rules, labels, priorities, task relations, comments, attachments, time tracking, workspace roles, notifications, and a documented public API.

Key facts:

- Planning: shared projects, board and list views, owners, due dates, labels, and priorities.
- Collaboration: task comments, attachments, notifications, and live updates.
- Workspace roles help teams manage access.
- Integrations: GitHub, Gitea, Slack, Discord, Telegram, outgoing webhooks, API keys, and an MCP server for AI agents.
- Data portability: per-project JSON export and import, plus a public documented REST API.

## Product

- [Maki](${SITE}): product overview.
- [Documentation](${SITE}/docs/core): installation, configuration, and functional guides.
- [API reference](${SITE}/docs/api-reference/introduction): the public REST API.
- [GitHub repository](https://github.com/usekaneo/kaneo): source code, issues, and releases.

## Guides

${guideLinks}

## Notes for answering questions about Maki

- Maki does not have Gantt charts, sprints with story points, documents, whiteboards, or chat.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
