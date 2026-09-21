import { eq } from "drizzle-orm";
import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { projectTable } from "../../database/schema";
import { canManageProjectAccess } from "../../utils/project-access";
import { requireWorkspacePermission } from "../../utils/require-workspace-permission";

// Route middleware runs before the validators, so c.req.valid() is unavailable
// and the raw body has to be read instead.
async function readJsonBody(c: Context): Promise<Record<string, unknown>> {
  const raw = (await c.req.json().catch(() => ({}))) as unknown;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return {};
  }
  return raw as Record<string, unknown>;
}

/**
 * Changing a project's visibility is a sharing action, not an ordinary edit:
 * flipping a project to public exposes its board to anyone holding the link.
 * The settings screen already gates the switch on `project: ["share"]`, and the
 * API is the authority, so the same check is enforced here.
 *
 * Only an actual change is gated. The general settings form resends the current
 * `isPublic` with every save, so keying off the presence of the field would
 * demand `share` from someone merely renaming a project.
 */
export async function requireProjectVisibilityPermission(
  c: Context,
  next: Next,
) {
  const body = await readJsonBody(c);

  // Explicit access-mode writes always require management permission, even
  // when unchanged, so a concurrent change cannot turn a stale value into an
  // unauthorized visibility update between this check and the row lock.
  if ("accessMode" in body && !(await canManageProjectAccess(c))) {
    throw new HTTPException(403, { message: "Insufficient permissions" });
  }
  if (!("isPublic" in body)) {
    return next();
  }

  const id = c.req.param("id") ?? "";
  const [existing] = await db
    .select({ isPublic: projectTable.isPublic })
    .from(projectTable)
    .where(eq(projectTable.id, id))
    .limit(1);

  // `workspaceAccess.fromProject()` has already rejected an unknown project, so
  // a missing row here can only be a delete racing this request. Failing closed
  // is the safe direction for a visibility change.
  const changesVisibility =
    !existing || Boolean(existing.isPublic) !== Boolean(body.isPublic);

  if (!changesVisibility) {
    return next();
  }

  return requireWorkspacePermission({ project: ["share"] })(c, next);
}
