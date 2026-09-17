import { existsSync, readFileSync } from "node:fs";
import process from "node:process";
import pg from "pg";

const { Client } = pg;

const msisdn = process.argv[2]?.trim() || "07000076782508";

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

const env = loadEnv();
const databaseUrl = getDatabaseUrl(env);
assertDatabaseUrl(databaseUrl);

const client = new Client(clientConfig(databaseUrl, env));

try {
  console.log(`Cible: ${formatTarget(databaseUrl)}`);
  console.log(`MSISDN: ${msisdn}`);

  await client.connect();

  const columns = await client.query(
    `
      select column_name, data_type
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'gsm_line_sdtr_snapshots'
        and column_name in (
          'payload',
          'used_value_go',
          'rest_value_go',
          'total_value_go',
          'usage_percent',
          'recharge_value_go',
          'recharge_label'
        )
      order by column_name;
    `,
  );

  console.log("Colonnes SDTR:");
  console.table(columns.rows);

  const latest = await client.query(
    `
      select
        msisdn,
        captured_at,
        used_value_go,
        rest_value_go,
        total_value_go,
        usage_percent,
        recharge_value_go,
        recharge_label,
        payload #>> array['data', '0', 'sRecharge'] as payload_s_recharge,
        payload #>> array['data', '0', 'recharge'] as payload_recharge
      from public.gsm_line_sdtr_snapshots
      where msisdn = $1
      order by captured_at desc
      limit 3;
    `,
    [msisdn],
  );

  console.log("Derniers snapshots:");
  console.table(latest.rows);
} finally {
  await client.end().catch(() => undefined);
}
