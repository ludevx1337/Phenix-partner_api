import { PhenixEndpoints } from "@/lib/phenix/endpoints";
import {
  phenixAuthResponseSchema,
  type PhenixAuthResponse,
} from "@/lib/phenix/schemas";
import { getPhenixCredentials } from "@/lib/phenix/secure-config";
import { createAdminClient } from "@/lib/supabase/server";

const SENSITIVE_KEYS = new Set([
  "access_token",
  "Access_token",
  "token",
  "Token",
  "password",
  "Password",
  "radiusPassword",
  "RadiusPassword",
  "puk",
  "Puk",
  "pin",
  "Pin",
]);

function maskSensitive(input: unknown): unknown {
  if (input === null || typeof input !== "object") {
    return input;
  }
  if (Array.isArray(input)) {
    return input.map(maskSensitive);
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    out[k] = SENSITIVE_KEYS.has(k) ? "[REDACTED]" : maskSensitive(v);
  }
  return out;
}

export { maskSensitive };

let tokenCache: { token: string; expiresAtMs: number } | null = null;
let refreshLock: Promise<string> | null = null;
let forceRefresh = false;
const TOKEN_SKEW_MS = 60_000;
const AUTH_ERROR_COOLDOWN_MS = Number(
  process.env.PHENIX_AUTH_ERROR_COOLDOWN_MS ?? "60000",
);

function getBaseUrl(): string {
  const base =
    process.env.PHENIX_API_BASE_URL ?? "https://api.phenix-partner.fr";
  return base.replace(/\/$/, "");
}

function extractToken(parsed: PhenixAuthResponse): string {
  const t =
    parsed.access_token ?? parsed.Access_token ?? parsed.token ?? parsed.Token;
  if (!t) {
    throw new Error("Réponse PHENIX /Auth/authenticate sans token utilisable.");
  }
  return t;
}

function extractExpiryMs(parsed: PhenixAuthResponse): number {
  const sec = parsed.expires_in ?? parsed.expiresIn;
  if (typeof sec === "number" && sec > 0) {
    return Date.now() + sec * 1000;
  }
  // défaut 50 min si non fourni
  return Date.now() + 50 * 60 * 1000;
}

type StoredTokenRow = {
  access_token: string | null;
  token_type: string | null;
  generated_at: string | null;
  expires_at: string | null;
  last_error: string | null;
  last_error_at: string | null;
  next_retry_at: string | null;
};

function isStillValid(expiresAtMs: number): boolean {
  return Date.now() < expiresAtMs - TOKEN_SKEW_MS;
}

async function readStoredToken(): Promise<StoredTokenRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("phenix_token_cache")
    .select(
      "access_token,token_type,generated_at,expires_at,last_error,last_error_at,next_retry_at",
    )
    .eq("id", 1)
    .maybeSingle<StoredTokenRow>();

  if (error) {
    console.error("[phenix] readStoredToken failed", error);
    return null;
  }
  return data ?? null;
}

async function upsertStoredToken(params: {
  accessToken: string;
  tokenType: string | null;
  generatedAtIso: string;
  expiresAtIso: string;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("phenix_token_cache").upsert(
    {
      id: 1,
      access_token: params.accessToken,
      token_type: params.tokenType,
      generated_at: params.generatedAtIso,
      expires_at: params.expiresAtIso,
      last_error: null,
      last_error_at: null,
      next_retry_at: null,
    },
    { onConflict: "id" },
  );
  if (error) {
    console.error("[phenix] upsertStoredToken failed", error);
  }
}

async function storeTokenError(errorMessage: string): Promise<void> {
  const now = Date.now();
  const nextRetryMs = now + Math.max(1_000, AUTH_ERROR_COOLDOWN_MS);
  const supabase = createAdminClient();
  const { error } = await supabase.from("phenix_token_cache").upsert(
    {
      id: 1,
      last_error: errorMessage,
      last_error_at: new Date(now).toISOString(),
      next_retry_at: new Date(nextRetryMs).toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) {
    console.error("[phenix] storeTokenError failed", error);
  }
}

async function fetchFreshToken(): Promise<{
  token: string;
  expiresAtMs: number;
}> {
  const credentials = await getPhenixCredentials();
  const { username, password, partenaireId } = credentials;
  const strictAuthBody = process.env.PHENIX_AUTH_STRICT_BODY === "true";
  if (!username || !password || (!strictAuthBody && !partenaireId)) {
    throw new Error(
      "Variables PHENIX_USERNAME, PHENIX_PASSWORD et PHENIX_PARTENAIRE_ID requises (partenaireId optionnel seulement si PHENIX_AUTH_STRICT_BODY=true).",
    );
  }

  const url = `${getBaseUrl()}${PhenixEndpoints.authenticate}`;
  const body = strictAuthBody
    ? {
        username,
        password,
      }
    : {
        username,
        password,
        partenaireId,
        // alias fréquents API .NET — ignorés si non supportés
        Username: username,
        Password: password,
        PartenaireId: partenaireId,
      };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const json: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const safe = maskSensitive(json);
    throw new Error(
      `Échec authentification PHENIX (${res.status}): ${JSON.stringify(safe)}`,
    );
  }

  const parsed = phenixAuthResponseSchema.parse(json);
  const token = extractToken(parsed);
  const expiresAtMs = extractExpiryMs(parsed);
  return { token, expiresAtMs };
}

/** Bearer token PHENIX — uniquement côté serveur. */
export async function getPhenixToken(): Promise<string> {
  if (!forceRefresh && tokenCache && isStillValid(tokenCache.expiresAtMs)) {
    return tokenCache.token;
  }
  if (refreshLock) {
    return refreshLock;
  }
  refreshLock = (async () => {
    if (!forceRefresh) {
      const stored = await readStoredToken();
      if (
        stored?.next_retry_at &&
        Date.now() < new Date(stored.next_retry_at).getTime()
      ) {
        throw new Error(
          stored.last_error
            ? `PHENIX auth en cooldown: ${stored.last_error}`
            : "PHENIX auth en cooldown, nouvel essai dans quelques secondes.",
        );
      }
      if (
        stored?.access_token &&
        stored.expires_at &&
        isStillValid(new Date(stored.expires_at).getTime())
      ) {
        tokenCache = {
          token: stored.access_token,
          expiresAtMs: new Date(stored.expires_at).getTime(),
        };
        return stored.access_token;
      }
    }

    try {
      const generatedAtMs = Date.now();
      const fresh = await fetchFreshToken();
      tokenCache = fresh;
      forceRefresh = false;
      await upsertStoredToken({
        accessToken: fresh.token,
        tokenType: "Bearer",
        generatedAtIso: new Date(generatedAtMs).toISOString(),
        expiresAtIso: new Date(fresh.expiresAtMs).toISOString(),
      });
      return fresh.token;
    } catch (error) {
      await storeTokenError(
        error instanceof Error
          ? error.message
          : "Erreur inconnue de token PHENIX",
      );
      throw error;
    }
  })().finally(() => {
    refreshLock = null;
  });
  return refreshLock;
}

export function invalidatePhenixToken(): void {
  tokenCache = null;
  forceRefresh = true;
}
