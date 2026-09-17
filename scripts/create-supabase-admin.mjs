import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { inspect } from "node:util";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const args = parseArgs(process.argv.slice(2));

function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;

    const [rawKey, inlineValue] = arg.slice(2).split("=", 2);
    const key = toCamelCase(rawKey);
    const nextValue = argv[index + 1];

    if (inlineValue !== undefined) {
      parsed[key] = inlineValue;
      continue;
    }

    if (nextValue && !nextValue.startsWith("--")) {
      parsed[key] = nextValue;
      index += 1;
      continue;
    }

    parsed[key] = "true";
  }

  return parsed;
}

function toCamelCase(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

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

function getRequiredValue(name, value) {
  if (!value?.trim()) {
    throw new Error(`${name} est requis.`);
  }

  if (value.includes("<") || value.includes(">")) {
    throw new Error(`${name} contient encore une valeur placeholder.`);
  }

  return value.trim();
}

function getSupabaseUrl(env) {
  const value = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_PROJECT_URL || "";
  const url = getRequiredValue("NEXT_PUBLIC_SUPABASE_URL", value);

  if (!url.startsWith("https://")) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL doit être l'URL API Supabase en https://<project-ref>.supabase.co.",
    );
  }

  return url;
}

function getAdminInput(env) {
  const email = getRequiredValue(
    "ADMIN_EMAIL",
    args.email || env.ADMIN_EMAIL || "",
  ).toLowerCase();
  const password = getRequiredValue(
    "ADMIN_PASSWORD",
    args.password || env.ADMIN_PASSWORD || "",
  );
  const displayName =
    args.displayName || env.ADMIN_DISPLAY_NAME || email.split("@")[0];
  const resetPassword = args.resetPassword === "true";

  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD doit contenir au moins 8 caractères.");
  }

  return {
    email,
    password,
    displayName,
    resetPassword,
  };
}

function createAdminClient(env) {
  const supabaseUrl = getSupabaseUrl(env);
  const serviceRoleKey = getRequiredValue(
    "SUPABASE_SERVICE_ROLE_KEY",
    env.SUPABASE_SERVICE_ROLE_KEY || "",
  );

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function findUserByEmail(supabase, email) {
  const perPage = 1000;

  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) throw error;

    const users = data?.users ?? [];
    const user = users.find(
      (candidate) => candidate.email?.toLowerCase() === email,
    );

    if (user) return user;
    if (users.length < perPage) return null;
  }

  throw new Error("Recherche utilisateur arrêtée après 100 pages.");
}

async function createOrPromoteAdmin(supabase, input) {
  const existingUser = await findUserByEmail(supabase, input.email);

  if (existingUser) {
    const updates = {
      app_metadata: {
        ...(existingUser.app_metadata ?? {}),
        role: "admin",
      },
      user_metadata: {
        ...(existingUser.user_metadata ?? {}),
        display_name: input.displayName,
      },
      email_confirm: true,
    };

    if (input.resetPassword) {
      updates.password = input.password;
    }

    const { data, error } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      updates,
    );

    if (error) throw error;

    return {
      user: data.user,
      created: false,
      passwordUpdated: input.resetPassword,
    };
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    app_metadata: {
      role: "admin",
    },
    user_metadata: {
      display_name: input.displayName,
    },
  });

  if (error) throw error;

  return {
    user: data.user,
    created: true,
    passwordUpdated: true,
  };
}

async function upsertAdminProfile(supabase, userId, input) {
  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      display_name: input.displayName,
      role: "admin",
    },
    {
      onConflict: "id",
    },
  );

  if (error) throw error;
}

async function main() {
  const env = loadEnv();
  const input = getAdminInput(env);
  const supabase = createAdminClient(env);

  const result = await createOrPromoteAdmin(supabase, input);
  await upsertAdminProfile(supabase, result.user.id, input);

  console.log(
    result.created ? "Utilisateur admin créé." : "Utilisateur promu admin.",
  );
  console.log(`Email: ${result.user.email}`);
  console.log(`User ID: ${result.user.id}`);

  if (!result.created && !result.passwordUpdated) {
    console.log(
      "Mot de passe inchangé. Ajoutez --reset-password pour le remplacer.",
    );
  }
}

main().catch((error) => {
  console.error("Échec de création de l'utilisateur admin.");
  console.error(formatError(error));
  process.exitCode = 1;
});

function formatError(error) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return inspect(error, { depth: 4, colors: false });
}
