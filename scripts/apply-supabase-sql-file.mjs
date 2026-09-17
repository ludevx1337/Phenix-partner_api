import { existsSync, readFileSync } from "node:fs";
import process from "node:process";
import pg from "pg";

const { Client } = pg;

const sqlFile = process.argv[2]?.trim();

if (!sqlFile) {
  throw new Error("Usage: node scripts/apply-supabase-sql-file.mjs <file.sql>");
}

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};

  const env = {};
  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    let value = rawValue.trim();
    const quoted =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"));
    if (quoted) value = value.slice(1, -1);
    env[key] = value;
  }
  return env;
}

function loadEnv() {
  return {
    ...parseEnvFile(".env"),
    ...parseEnvFile(".env.local"),
    ...process.env,
  };
}

function getDatabaseUrl(env) {
  return (
    env.SUPABASE_DB_URL ||
    env.SUPABASE_URL ||
    env.DATABASE_URL ||
    env.POSTGRES_URL ||
    ""
  );
}

function assertDatabaseUrl(databaseUrl) {
  if (
    !databaseUrl ||
    (!databaseUrl.startsWith("postgresql://") &&
      !databaseUrl.startsWith("postgres://"))
  ) {
    throw new Error(
      "URL Postgres manquante. Renseignez SUPABASE_DB_URL dans .env.",
    );
  }
}

function formatTarget(databaseUrl) {
  const url = new URL(databaseUrl);
  const username = url.username ? `${url.username}:***@` : "";
  return `${url.protocol}//${username}${url.host}${url.pathname}`;
}

function clientConfig(databaseUrl, env) {
  return {
    connectionString: databaseUrl,
    ssl:
      env.SUPABASE_DB_SSL === "false"
        ? false
        : {
            rejectUnauthorized:
              env.SUPABASE_DB_SSL_REJECT_UNAUTHORIZED === "true",
          },
  };
}

if (!existsSync(sqlFile)) {
  throw new Error(`Fichier SQL introuvable: ${sqlFile}`);
}

const env = loadEnv();
const databaseUrl = getDatabaseUrl(env);
assertDatabaseUrl(databaseUrl);

const client = new Client(clientConfig(databaseUrl, env));
const sql = readFileSync(sqlFile, "utf8");

try {
  console.log(`Cible: ${formatTarget(databaseUrl)}`);
  console.log(`SQL: ${sqlFile}`);
  await client.connect();
  await client.query("begin");
  await client.query(sql);
  await client.query("commit");
  console.log("SQL appliqué avec succès.");
} catch (error) {
  await client.query("rollback").catch(() => undefined);
  throw error;
} finally {
  await client.end().catch(() => undefined);
}
