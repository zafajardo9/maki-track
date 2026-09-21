import { randomUUID } from "node:crypto";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";
import { expect, it } from "vitest";

it("preserves populated project access and public links while restricting future projects", async () => {
  const url = new URL(process.env.DATABASE_URL!);
  if (!url.pathname.endsWith("_test"))
    throw new Error("Test database required");
  const name = `maki_access_${randomUUID().replaceAll("-", "")}_test`;
  url.pathname = "/postgres";
  const admin = new Client({ connectionString: url.toString() });
  await admin.connect();
  await admin.query(`CREATE DATABASE "${name}"`);
  url.pathname = `/${name}`;
  const client = new Client({ connectionString: url.toString() });
  const temporary = await mkdtemp(resolve(tmpdir(), "maki-access-migration-"));
  try {
    await client.connect();
    const source = resolve(import.meta.dirname, "../../apps/api/drizzle");
    await mkdir(resolve(temporary, "meta"));
    const journal = JSON.parse(
      await readFile(resolve(source, "meta/_journal.json"), "utf8"),
    );
    journal.entries = journal.entries.filter(
      (entry: { idx: number }) => entry.idx < 49,
    );
    await writeFile(
      resolve(temporary, "meta/_journal.json"),
      JSON.stringify(journal),
    );
    for (const file of await readdir(source))
      if (file.endsWith(".sql") && Number(file.slice(0, 4)) < 49)
        await copyFile(resolve(source, file), resolve(temporary, file));
    await migrate(drizzle(client), { migrationsFolder: temporary });
    await client.query(`INSERT INTO workspace (id, name, slug, created_at) VALUES ('w', 'Workspace', 'workspace', now());
      INSERT INTO project (id, workspace_id, name, slug, is_public) VALUES ('old', 'w', 'Existing', 'OLD', true);`);
    await migrate(drizzle(client), { migrationsFolder: source });
    expect(
      (
        await client.query(
          "SELECT access_mode, is_public FROM project WHERE id = 'old'",
        )
      ).rows,
    ).toEqual([{ access_mode: "workspace", is_public: true }]);
    await client.query(
      "INSERT INTO project (id, workspace_id, name, slug) VALUES ('new', 'w', 'New', 'NEW')",
    );
    expect(
      (await client.query("SELECT access_mode FROM project WHERE id = 'new'"))
        .rows[0].access_mode,
    ).toBe("restricted");
    await expect(
      client.query("UPDATE project SET is_public = true WHERE id = 'new'"),
    ).rejects.toThrow();
  } finally {
    await client.end();
    await admin.query(`DROP DATABASE "${name}"`);
    await admin.end();
    await rm(temporary, { recursive: true, force: true });
  }
});
