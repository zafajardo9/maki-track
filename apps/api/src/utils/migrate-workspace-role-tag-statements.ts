import { DEFAULT_ROLE_NAMES, defaultRolePayloads } from "@maki/permissions";
import { and, eq, sql } from "drizzle-orm";
import db, { schema } from "../database";

/**
 * Backfill the `tag` permission key into pre-existing workspace_role rows.
 *
 * Role payloads are admin-editable JSON, so rows created before the tag
 * statements existed have no `tag` key: the Roles UI still renders the
 * toggles (it iterates the statement vocabulary), but enforcement treats a
 * missing key as "denied" until an admin grants something. Seeding the key
 * on the default roles (viewer/member/admin) restores their intended
 * out-of-the-box behavior on existing installs.
 *
 * Additive only: rows that already carry a `tag` key (edited or seeded) are
 * left untouched, every other key is preserved byte-for-byte, and custom
 * non-default roles are not granted anything implicitly. Idempotent: a
 * second run finds every row already keyed and updates nothing.
 */
export async function migrateWorkspaceRoleTagStatements() {
  try {
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'workspace_role'
      ) AS exists;
    `);

    const exists =
      tableExists.rows[0]?.exists === true ||
      tableExists.rows[0]?.exists === "t";
    if (!exists) {
      console.log(
        "🛈 workspace_role table does not exist; skipping tag permission backfill.",
      );
      return;
    }

    const rows = await db
      .select({
        id: schema.workspaceRoleTable.id,
        role: schema.workspaceRoleTable.role,
        permission: schema.workspaceRoleTable.permission,
      })
      .from(schema.workspaceRoleTable);

    let updated = 0;
    for (const row of rows) {
      let payload: unknown;
      try {
        payload = JSON.parse(row.permission);
      } catch {
        // Malformed payloads are handled elsewhere; never rewrite them here.
        continue;
      }

      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        continue;
      }

      const permissions = payload as Record<string, unknown>;
      if ("tag" in permissions) {
        continue;
      }

      // Only the seeded default roles get an implicit grant; custom roles
      // stay deny-by-default until an admin opts them in.
      const defaultRoleName = DEFAULT_ROLE_NAMES.find(
        (name) => name === row.role,
      );
      if (!defaultRoleName) {
        continue;
      }

      permissions.tag = [...(defaultRolePayloads[defaultRoleName].tag ?? [])];
      const result = await db
        .update(schema.workspaceRoleTable)
        .set({ permission: JSON.stringify(permissions) })
        .where(
          and(
            eq(schema.workspaceRoleTable.id, row.id),
            eq(schema.workspaceRoleTable.permission, row.permission),
          ),
        );
      updated += result.rowCount ?? 0;
    }

    if (updated > 0) {
      console.log(
        `✅ Backfilled tag permissions on ${updated} workspace role row(s).`,
      );
    }
  } catch (error) {
    console.error(
      "❌ Failed to backfill workspace role tag permissions:",
      error,
    );
    throw error;
  }
}
