import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, vi } from "vitest";

// Prevent dotenv-mono from loading the local .env file during tests.
// All env vars are set explicitly below; the .env file must be ignored.
vi.mock("dotenv-mono", () => ({
  config: () => {},
}));

function stripEnvValueQuotes(value: string) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function deriveTestDatabaseUrl(connectionString: string) {
  const url = new URL(connectionString);
  const databaseName = url.pathname.replace(/^\//, "");

  if (!databaseName || databaseName.endsWith("_test")) {
    return connectionString;
  }

  url.pathname = `/${databaseName}_test`;
  return url.toString();
}

function assertTestDatabaseUrl(connectionString: string) {
  const url = new URL(connectionString);
  const databaseName = url.pathname.replace(/^\//, "");
  if (!databaseName.endsWith("_test")) {
    throw new Error(
      `Integration tests require DATABASE_URL to use a database name ending in _test (got "${databaseName}")`,
    );
  }
}

function readDatabaseUrlFromEnvFile() {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const envPath = resolve(currentDir, "../../.env");

  if (!existsSync(envPath)) {
    return null;
  }

  const envFile = readFileSync(envPath, "utf8");
  const match = envFile.match(/^DATABASE_URL=(.+)$/m);
  const raw = match?.[1]?.trim();
  return raw ? stripEnvValueQuotes(raw) : null;
}

const defaultTestDatabaseUrl =
  "postgresql://postgres:postgres@localhost:5432/maki_test";
const envDatabaseUrl = process.env.DATABASE_URL?.trim();
const fromEnv = envDatabaseUrl ? stripEnvValueQuotes(envDatabaseUrl) : "";
const rawDatabaseUrl =
  fromEnv || readDatabaseUrlFromEnvFile() || defaultTestDatabaseUrl;
process.env.DATABASE_URL = deriveTestDatabaseUrl(rawDatabaseUrl);
assertTestDatabaseUrl(process.env.DATABASE_URL);

process.env.NODE_ENV = "test";
process.env.AUTH_SECRET = "test-secret-with-at-least-32-chars";
process.env.MAKI_API_URL = "http://localhost:1337";
process.env.MAKI_CLIENT_URL = "http://localhost:5173";
process.env.DISABLE_REGISTRATION = "false";
process.env.DEMO_MODE = "false";
process.env.RESEND_API_KEY = "";
process.env.DEVICE_AUTH_CLIENT_IDS = "maki-cli";

afterEach(() => {
  vi.restoreAllMocks();
});
