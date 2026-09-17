import { existsSync, readFileSync } from "node:fs";
import process from "node:process";

const action = process.argv[2]?.trim();
const msisdn = process.argv[3]?.trim();

if (!action) {
  throw new Error(
    "Usage: node scripts/invoke-phenix-maintenance.mjs <action> [msisdn]",
  );
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

const env = {
  ...parseEnvFile(".env"),
  ...parseEnvFile(".env.local"),
  ...process.env,
};

const projectUrl = env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const cronSecret = env.PHENIX_MAINTENANCE_SECRET;

if (!projectUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL est requis dans .env.");
}

if (!cronSecret) {
  throw new Error("PHENIX_MAINTENANCE_SECRET est requis dans .env.");
}

const body = {
  action,
  ...(msisdn ? { msisdn } : {}),
};

const response = await fetch(`${projectUrl}/functions/v1/phenix-maintenance`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-cron-secret": cronSecret,
  },
  body: JSON.stringify(body),
});

const content = await response.text();

console.log(`Status: ${response.status}`);
console.log(content);

if (!response.ok) {
  process.exitCode = 1;
}
