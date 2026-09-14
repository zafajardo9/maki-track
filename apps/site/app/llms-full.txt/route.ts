import { guideList, guidePath } from "@/lib/guides";

export const dynamic = "force-static";

const SITE = "https://kaneo.app";

function guideMarkdown() {
  return guideList
    .map((guide) => {
      const sections = guide.sections
        .map((section) => {
          const body = section.body?.join("\n\n") ?? "";
          const items =
            section.items
              ?.map(
                (item) =>
                  `- **${item.name}**${item.meta ? ` (${item.meta})` : ""}: ${item.body}`,
              )
              .join("\n") ?? "";
          return `### ${section.heading}\n\n${[body, items].filter(Boolean).join("\n\n")}`;
        })
        .join("\n\n");

      const faq = guide.faq
        .map((entry) => `**${entry.question}**\n\n${entry.answer}`)
        .join("\n\n");

      return `## ${guide.question}

URL: ${SITE}${guidePath(guide.slug)}
Last updated: ${guide.updatedOn}

${guide.answer}

${sections}

${faq}`;
    })
    .join("\n\n---\n\n");
}

export function GET() {
  const body = `# Maki, full content

> Maki is a project management platform built for teams to plan, collaborate, and track delivery. This file contains the full text of Maki's guides. Written by the Maki team.

# Guides

${guideMarkdown()}
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
