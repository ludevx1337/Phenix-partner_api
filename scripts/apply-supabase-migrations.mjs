import { existsSync, readFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { inspect } from "node:util";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const migrationsDir = path.join(rootDir, "supabase", "migrations");

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const allowExisting = args.has("--allow-existing");

const projectTables = [
  "profiles",
  "phenix_api_logs",
  "gsm_lines",
  "gsm_line_history",
  "data_recharges",
  "data_recharge_history",
  "sim_orders",
  "esim_orders",
  "sim_stock",
  "gsm_requests",
  "portabilities",
  "esim_qrcodes",
  "notifications",
  "customers",
  "gsm_products",
  "gsm_profiles",
  "phenix_token_cache",
  "phenix_secure_config",
];

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};

  const content = readFileSync(filePath, "utf8");
  const env = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    env[key] = normalizeEnvValue(rawValue);
  }

  return env;
}

function normalizeEnvValue(rawValue) {
  let value = rawValue.trim();
  const isSingleQuoted = value.startsWith("'") && value.endsWith("'");
  const isDoubleQuoted = value.startsWith('"') && value.endsWith('"');

  if (isSingleQuoted || isDoubleQuoted) {
    value = value.slice(1, -1);
  }

  return value;
}

function loadEnv() {
  return {
    ...parseEnvFile(path.join(rootDir, ".env")),
    ...parseEnvFile(path.join(rootDir, ".env.local")),
    ...process.env,
  };
}

function getDatabaseUrlConfig(env) {
  const candidates = [
    ["SUPABASE_DB_URL", env.SUPABASE_DB_URL],
    ["SUPABASE_URL", env.SUPABASE_URL],
    ["DATABASE_URL", env.DATABASE_URL],
    ["POSTGRES_URL", env.POSTGRES_URL],
  ];
  const [name, value] =
    candidates.find(([, candidate]) => candidate?.trim()) ?? [];

  return {
    name: name ?? "SUPABASE_DB_URL",
    value: value ?? "",
  };
}

function assertValidDatabaseUrl({ name, value: databaseUrl }) {
  if (!databaseUrl) {
    throw new Error(
      "URL Postgres Supabase manquante. Ajoutez SUPABASE_DB_URL ou SUPABASE_URL dans .env.local ou .env.",
    );
  }

  if (
    !databaseUrl.startsWith("postgresql://") &&
    !databaseUrl.startsWith("postgres://")
  ) {
    throw new Error(
      `${name} doit être une URL Postgres et commencer par postgresql:// ou postgres://. L'URL API https://<project-ref>.supabase.co ne suffit pas pour exécuter les migrations.`,
    );
  }

  if (databaseUrl.includes("<") || databaseUrl.includes(">")) {
    throw new Error(
      `${name} contient encore des placeholders. Remplacez <project-ref> et <db-password> par les vraies valeurs Supabase.`,
    );
  }
}

function shouldUseSsl(databaseUrl, env) {
  if (env.SUPABASE_DB_SSL === "false") return false;
  if (env.SUPABASE_DB_SSL === "true") return true;

  const { hostname } = new URL(databaseUrl);
  return !["localhost", "127.0.0.1", "::1"].includes(hostname);
}

function getClientConfig(databaseUrl, env) {
  const useSsl = shouldUseSsl(databaseUrl, env);
  return {
    connectionString: databaseUrl,
    ssl: useSsl
      ? {
          rejectUnauthorized:
            env.SUPABASE_DB_SSL_REJECT_UNAUTHORIZED === "true",
        }
      : false,
  };
}

function formatTarget(databaseUrl) {
  const url = new URL(databaseUrl);
  const username = url.username ? `${url.username}:***@` : "";
  return `${url.protocol}//${username}${url.host}${url.pathname}`;
}

async function listMigrationFiles() {
  const entries = await readdir(migrationsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => path.join(migrationsDir, name));
}

async function assertPublicSchemaIsEmpty(client) {
  const { rows } = await client.query(
    `
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_type = 'BASE TABLE'
      order by table_name;
    `,
  );

  const existingProjectTables = rows
    .map((row) => row.table_name)
    .filter((tableName) => projectTables.includes(tableName));

  if (!existingProjectTables.length) return;

  throw new Error(
    [
      "La base contient déjà des tables du projet dans public.",
      `Tables détectées: ${existingProjectTables.join(", ")}`,
      "Pour forcer malgré tout: npm run supabase:migrate -- --allow-existing",
    ].join("\n"),
  );
}

async function applyMigration(client, filePath) {
  const sql = await readFile(filePath, "utf8");
  const label = path.relative(rootDir, filePath);

  if (!sql.trim()) {
    console.log(`- ${label} ignoré (fichier vide)`);
    return;
  }

  console.log(`- ${label}`);
  await client.query("begin");

  try {
    await client.query(sql);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

async function main() {
  const env = loadEnv();
  const databaseUrlConfig = getDatabaseUrlConfig(env);
  assertValidDatabaseUrl(databaseUrlConfig);
  const databaseUrl = databaseUrlConfig.value;

  const files = await listMigrationFiles();
  if (!files.length) {
    throw new Error("Aucune migration SQL trouvée dans supabase/migrations.");
  }

  console.log(`Cible: ${formatTarget(databaseUrl)}`);
  console.log(`Migrations: ${files.length}`);

  if (dryRun) {
    files.forEach((filePath) =>
      console.log(`- ${path.relative(rootDir, filePath)}`),
    );
    return;
  }

  const client = new Client(getClientConfig(databaseUrl, env));
  await client.connect();

  try {
    if (!allowExisting) {
      await assertPublicSchemaIsEmpty(client);
    }

    for (const filePath of files) {
      await applyMigration(client, filePath);
    }
  } finally {
    await client.end();
  }

  console.log("Migrations Supabase appliquées avec succès.");
}

main().catch((error) => {
  console.error("Échec des migrations Supabase.");
  console.error(formatError(error));
  process.exitCode = 1;
});

function formatError(error) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return inspect(error, { depth: 4, colors: false });
}
