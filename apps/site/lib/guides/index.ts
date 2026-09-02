import { euHostedProjectManagementGdpr } from "./eu-hosted-project-management-gdpr";
import { projectManagementForSmallTeams } from "./project-management-for-small-teams";
import { projectManagementMcpAiAgents } from "./project-management-mcp-ai-agents";
import { projectManagementToolsWithFreeSso } from "./project-management-tools-with-free-sso";
import { selfHostProjectManagementDocker } from "./self-host-project-management-docker";
import type { Guide } from "./types";

export type { Guide, GuideItem, GuideSection } from "./types";
export { guidePath } from "./types";

const all: Guide[] = [
  projectManagementToolsWithFreeSso,
  selfHostProjectManagementDocker,
  projectManagementForSmallTeams,
  euHostedProjectManagementGdpr,
  projectManagementMcpAiAgents,
];

export const guideList = all;

export const guides: Record<string, Guide> = Object.fromEntries(
  all.map((guide) => [guide.slug, guide]),
);

export function getGuide(slug: string) {
  return guides[slug];
}
