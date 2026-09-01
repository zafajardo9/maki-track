export type ParsedArgs = {
  plankaUrl?: string;
  plankaUser?: string;
  plankaPassword?: string;
  plankaToken?: string;
  plankaApiKey?: string;
  makiUrl?: string;
  makiApiKey?: string;
  workspace?: string;
  projects: string[];
  icon?: string;
  report?: string;
  all: boolean;
  dryRun: boolean;
  skipComments: boolean;
  yes: boolean;
  help: boolean;
  version: boolean;
};

const STRING_FLAGS: Record<string, keyof ParsedArgs> = {
  "--planka-url": "plankaUrl",
  "--planka-user": "plankaUser",
  "--planka-password": "plankaPassword",
  "--planka-token": "plankaToken",
  "--planka-api-key": "plankaApiKey",
  "--maki-url": "makiUrl",
  "--maki-api-key": "makiApiKey",
  "--workspace": "workspace",
  "--icon": "icon",
  "--report": "report",
};

const BOOLEAN_FLAGS: Record<string, keyof ParsedArgs> = {
  "--all": "all",
  "--dry-run": "dryRun",
  "--skip-comments": "skipComments",
  "--yes": "yes",
  "-y": "yes",
  "--help": "help",
  "-h": "help",
  "--version": "version",
  "-v": "version",
};

export function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    projects: [],
    all: false,
    dryRun: false,
    skipComments: false,
    yes: false,
    help: false,
    version: false,
  };

  for (let index = 0; index < argv.length; index++) {
    const raw = argv[index] as string;
    const equals = raw.indexOf("=");
    const flag = equals === -1 ? raw : raw.slice(0, equals);
    const inlineValue = equals === -1 ? undefined : raw.slice(equals + 1);

    if (flag in BOOLEAN_FLAGS) {
      const key = BOOLEAN_FLAGS[flag] as
        | "all"
        | "dryRun"
        | "skipComments"
        | "yes"
        | "help"
        | "version";
      parsed[key] = true;
      continue;
    }

    if (flag === "--project") {
      const value = inlineValue ?? argv[++index];
      if (value === undefined) throw new Error("--project requires a value");
      parsed.projects.push(value);
      continue;
    }

    if (flag in STRING_FLAGS) {
      const value = inlineValue ?? argv[++index];
      if (value === undefined) throw new Error(`${flag} requires a value`);
      const key = STRING_FLAGS[flag] as Exclude<
        keyof ParsedArgs,
        | "projects"
        | "all"
        | "dryRun"
        | "skipComments"
        | "yes"
        | "help"
        | "version"
      >;
      parsed[key] = value;
      continue;
    }

    throw new Error(`Unknown option: ${flag}`);
  }

  return parsed;
}

export const DEFAULT_MAKI_URL = "https://cloud.kaneo.app";

export const HELP_TEXT = `maki-planka-import: migrate PLANKA boards into Maki

Usage:
  npx @maki/planka-import --planka-url <url> --maki-api-key <key> [options]

PLANKA source:
  --planka-url <url>        PLANKA instance URL (required)
  --planka-user <user>      Email or username (prompted if omitted)
  --planka-password <pass>  Password (env PLANKA_PASSWORD, or prompted)
  --planka-token <token>    Use an existing access token instead of logging in
  --planka-api-key <key>    Use a PLANKA user API key (env PLANKA_API_KEY).
                            Best option for SSO-only accounts, which have no
                            password to log in with

Maki target:
  --maki-url <url>         Maki instance URL (default ${DEFAULT_MAKI_URL})
  --maki-api-key <key>     Maki API key (env MAKI_API_KEY)
  --workspace <id>          Target workspace ID (prompted if omitted)

Selection:
  --project <name|id>       Migrate only this PLANKA project (repeatable)
  --all                     Migrate every project without prompting

Behaviour:
  --dry-run                 Report what would be migrated, write nothing
  --skip-comments           Do not migrate card comments
  --icon <name>             Lucide icon for created projects (default Layout)
  --report <path>           Write a JSON report to this path
  -y, --yes                 Do not ask for confirmation before writing
  -h, --help                Show this help
  -v, --version             Show the version

Examples:
  npx @maki/planka-import --planka-url https://planka.acme.com --dry-run
  npx @maki/planka-import --planka-url https://planka.acme.com \\
    --maki-api-key maki_xxx --workspace ws_123 --all
`;
