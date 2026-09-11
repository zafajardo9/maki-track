export type ProjectShareTarget = {
  projectId: string;
  workspaceId: string;
  isPublic: boolean | null | undefined;
  origin: string;
};

type ProjectLinkTarget = {
  projectId: string;
  workspaceId: string;
  origin: string;
};

/** The link to advertise when a project is made public. */
export function getPublicProjectLink(projectId: string, origin: string) {
  return `${origin}/public-project/${projectId}`;
}

/**
 * The in-app link to a project. It sits behind the session guard, so following
 * it signs the visitor in first, which is exactly what keeps it limited to
 * members of the workspace.
 */
export function getProjectInternalLink({
  projectId,
  workspaceId,
  origin,
}: ProjectLinkTarget) {
  return `${origin}/dashboard/workspace/${workspaceId}/project/${projectId}`;
}

/**
 * The single link a project should be shared with, which depends on its
 * visibility. A public project is readable by anyone at `/public-project/{id}`,
 * a read-only view with no mutation surface; a private project has no anonymous
 * view at all.
 */
export function getProjectShareLink({
  projectId,
  workspaceId,
  isPublic,
  origin,
}: ProjectShareTarget) {
  return isPublic
    ? getPublicProjectLink(projectId, origin)
    : getProjectInternalLink({ projectId, workspaceId, origin });
}
