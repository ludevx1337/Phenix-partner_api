// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2.105.0";

type Action = "sync-lines" | "refresh-sdtr" | "purge-sdtr" | "send-alerts";

type GsmLine = {
  id: string;
  user_id: string;
  msisdn: string;
  iccid: string | null;
  operateur: string | null;
  etat: string | null;
  partenaire_id: string | null;
  code_client: string | null;
  nom_client: string | null;
  forfait_gsm_code: string | null;
  code_tarif_achat: string | null;
  ip_fixe: string | null;
};

type SdtrUsageSummary = {
  usedValueGo: number | null;
  restValueGo: number | null;
  totalValueGo: number | null;
  usagePercent: number | null;
  rechargeValueGo: number | null;
  rechargeLabel: string | null;
};

type JsonRecord = Record<string, unknown>;

type AlertRow = {
  line_id: string | null;
  msisdn: string;
  code_client?: string | null;
  nom_client?: string | null;
  used_value_go: number | string | null;
  rest_value_go: number | string | null;
  total_value_go: number | string | null;
  usage_percent: number | string | null;
  recharge_value_go: number | string | null;
  recharge_label: string | null;
  captured_at: string;
};

const PHENIX_ENDPOINTS = {
  authenticate: "/Auth/authenticate",
  msisdnConsultAll: "/GsmApi/V2/MsisdnConsultAll",
  sdtrConso: "/GsmApi/V2/SdtrConso",
} as const;

const ALERT_HOURS_PARIS = new Set([8, 12, 14, 18]);
const TOKEN_SKEW_MS = 60_000;
const DEFAULT_PHENIX_TIMEOUT_MS = 25_000;
const DEFAULT_RESEND_TIMEOUT_MS = 20_000;
const DEFAULT_PUSHOVER_TIMEOUT_MS = 10_000;

const supabase = createClient(
  requiredEnv("PROJECT_URL"),
  requiredEnv("SERVICE_ROLE_KEY"),
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

Deno.serve(async (request) => {
  try {
    if (request.method !== "POST") {
      return json({ error: "Méthode non autorisée" }, 405);
    }

    assertCronSecret(request);
    const body = (await request.json().catch(() => ({}))) as {
      action?: Action;
      force?: boolean;
      msisdn?: string;
    };
    const action = body.action;

    if (!action) {
      return json({ error: "Action manquante" }, 400);
    }

    if (action === "sync-lines") {
      return json(await syncLines());
    }
    if (action === "refresh-sdtr") {
      return json(await refreshSdtr(body.msisdn?.trim()));
    }
    if (action === "purge-sdtr") {
      return json(await purgeSdtrIfNeeded());
    }
    if (action === "send-alerts") {
      return json(await sendAlertsIfNeeded(body.force === true));
    }

    return json({ error: "Action inconnue" }, 400);
  } catch (error) {
    console.error("[phenix-maintenance]", error);
    return json(
      {
        error: error instanceof Error ? error.message : "Erreur inconnue",
      },
      500,
    );
  }
});

function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    throw new Error(`${name} est requis.`);
  }
  return value;
}

function optionalEnv(name: string, fallback = ""): string {
  return Deno.env.get(name)?.trim() || fallback;
}

function assertCronSecret(request: Request) {
  const expected = requiredEnv("PHENIX_MAINTENANCE_SECRET");
  const received = request.headers.get("x-cron-secret") ?? "";

  if (!received || received !== expected) {
    throw new Error("Secret cron invalide.");
  }
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number,
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`Requête HTTP timeout après ${timeoutMs}ms.`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function getPhenixBaseUrl() {
  return optionalEnv(
    "PHENIX_API_BASE_URL",
    "https://api.phenix-partner.fr",
  ).replace(/\/$/, "");
}

function getPhenixCredentials() {
  return {
    username: requiredEnv("PHENIX_USERNAME"),
    password: requiredEnv("PHENIX_PASSWORD"),
    partenaireId: requiredEnv("PHENIX_PARTENAIRE_ID"),
  };
}

async function getOwnerUserId(): Promise<string> {
  const explicit = Deno.env.get("PHENIX_OWNER_USER_ID")?.trim();
  if (explicit) return explicit;

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (error) throw error;
  if (!data?.id) {
    throw new Error(
      "Aucun admin trouvé. Définissez PHENIX_OWNER_USER_ID ou créez un profil admin.",
    );
  }

  return data.id;
}

async function getPhenixToken(): Promise<string> {
  const { data: stored, error } = await supabase
    .from("phenix_token_cache")
    .select("access_token,expires_at,next_retry_at,last_error")
    .eq("id", 1)
    .maybeSingle<{
      access_token: string | null;
      expires_at: string | null;
      next_retry_at: string | null;
      last_error: string | null;
    }>();

  if (error) {
    console.warn("[phenix-maintenance] token cache read failed", error);
  }

  if (
    stored?.next_retry_at &&
    Date.now() < new Date(stored.next_retry_at).getTime()
  ) {
    throw new Error(stored.last_error ?? "PHENIX auth en cooldown.");
  }

  if (
    stored?.access_token &&
    stored.expires_at &&
    Date.now() < new Date(stored.expires_at).getTime() - TOKEN_SKEW_MS
  ) {
    return stored.access_token;
  }

  return fetchFreshToken();
}

async function fetchFreshToken(): Promise<string> {
  const credentials = getPhenixCredentials();
  const strictAuthBody = optionalEnv("PHENIX_AUTH_STRICT_BODY") === "true";
  const body = strictAuthBody
    ? {
        username: credentials.username,
        password: credentials.password,
      }
    : {
        username: credentials.username,
        password: credentials.password,
        partenaireId: credentials.partenaireId,
        Username: credentials.username,
        Password: credentials.password,
        PartenaireId: credentials.partenaireId,
      };

  const response = await fetchWithTimeout(
    `${getPhenixBaseUrl()}${PHENIX_ENDPOINTS.authenticate}`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
    Number(
      optionalEnv(
        "PHENIX_REQUEST_TIMEOUT_MS",
        String(DEFAULT_PHENIX_TIMEOUT_MS),
      ),
    ),
  );
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    await storeTokenError(`Échec authentification PHENIX (${response.status})`);
    throw new Error(`Échec authentification PHENIX (${response.status}).`);
  }

  const token = extractToken(payload);
  const expiresAtMs = extractExpiryMs(payload);
  const generatedAt = new Date();

  await supabase.from("phenix_token_cache").upsert(
    {
      id: 1,
      access_token: token,
      token_type: "Bearer",
      generated_at: generatedAt.toISOString(),
      expires_at: new Date(expiresAtMs).toISOString(),
      last_error: null,
      last_error_at: null,
      next_retry_at: null,
    },
    { onConflict: "id" },
  );

  return token;
}

async function storeTokenError(message: string) {
  const now = Date.now();
  const cooldownMs = Number(
    optionalEnv("PHENIX_AUTH_ERROR_COOLDOWN_MS", "60000"),
  );
  await supabase.from("phenix_token_cache").upsert(
    {
      id: 1,
      last_error: message,
      last_error_at: new Date(now).toISOString(),
      next_retry_at: new Date(now + Math.max(1000, cooldownMs)).toISOString(),
    },
    { onConflict: "id" },
  );
}

function extractToken(payload: unknown): string {
  const source =
    payload && typeof payload === "object" ? (payload as JsonRecord) : {};
  const token =
    source.access_token ?? source.Access_token ?? source.token ?? source.Token;
  if (typeof token !== "string" || !token) {
    throw new Error("Réponse PHENIX sans token.");
  }
  return token;
}

function extractExpiryMs(payload: unknown): number {
  const source =
    payload && typeof payload === "object" ? (payload as JsonRecord) : {};
  const seconds = source.expires_in ?? source.expiresIn;
  return typeof seconds === "number" && seconds > 0
    ? Date.now() + seconds * 1000
    : Date.now() + 50 * 60 * 1000;
}

async function phenixFetch(options: {
  path: string;
  method?: "GET" | "POST";
  query?: Record<string, string>;
  body?: unknown;
}): Promise<unknown> {
  const url = new URL(`${getPhenixBaseUrl()}${options.path}`);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    url.searchParams.set(key, value);
  }

  async function requestWithToken(token: string) {
    return fetchWithTimeout(
      url.toString(),
      {
        method: options.method ?? "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          ...(options.body ? { "Content-Type": "application/json" } : {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      },
      Number(
        optionalEnv(
          "PHENIX_REQUEST_TIMEOUT_MS",
          String(DEFAULT_PHENIX_TIMEOUT_MS),
        ),
      ),
    );
  }

  let token = await getPhenixToken();
  let response = await requestWithToken(token);

  if (response.status === 401) {
    token = await fetchFreshToken();
    response = await requestWithToken(token);
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      `PHENIX ${options.method ?? "GET"} ${options.path} -> ${response.status}`,
    );
  }

  return payload;
}

function pickString(
  source: Record<string, unknown>,
  keys: string[],
  allowEmpty = false,
) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && (allowEmpty || value.length > 0)) {
      return value;
    }
  }
  return null;
}

function extractLinesArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  const source = payload as Record<string, unknown>;
  for (const key of [
    "lines",
    "Lines",
    "items",
    "Items",
    "data",
    "Data",
    "result",
    "Result",
    "msisdns",
    "Msisdns",
  ]) {
    const value = source[key];
    if (Array.isArray(value)) return value;
  }

  return [];
}

function normalizeLine(raw: unknown) {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Record<string, unknown>;
  const msisdn = pickString(source, [
    "msisdn",
    "Msisdn",
    "MSISDN",
    "numero",
    "Numero",
  ]);

  if (!msisdn) return null;

  return {
    msisdn,
    iccid: pickString(source, [
      "iccid",
      "Iccid",
      "ICCID",
      "simSerial",
      "SimSerial",
    ]),
    operateur: pickString(source, [
      "operateur",
      "Operateur",
      "operator",
      "Operator",
      "operateurId",
    ]),
    etat: pickString(source, [
      "etatLibelle",
      "EtatLibelle",
      "etat_libelle",
      "Etat_Libelle",
      "etat",
      "Etat",
      "state",
      "State",
      "statut",
      "Statut",
    ]),
    partenaireId: pickString(source, [
      "partenaireId",
      "PartenaireId",
      "partenaire_id",
    ]),
    codeClient: pickString(source, ["codeClient", "CodeClient", "code_client"]),
    nomClient: pickString(
      source,
      ["nomClient", "NomClient", "nom_client", "Nom"],
      true,
    ),
    forfaitGsmCode: pickString(
      source,
      [
        "forfaitGsmCode",
        "ForfaitGsmCode",
        "forfait_gsm_code",
        "codeForfait",
        "CodeForfait",
      ],
      true,
    ),
    codeTarifAchat: pickString(
      source,
      [
        "codeTarifAchat",
        "CodeTarifAchat",
        "code_tarif_achat",
        "tarifAchat",
        "TarifAchat",
      ],
      true,
    ),
    ipFixe: pickString(
      source,
      ["ipFixe", "IpFixe", "ip_fixe", "ipFixeGsm"],
      true,
    ),
    raw: source,
  };
}

async function syncLines() {
  const userId = await getOwnerUserId();
  const partenaireId = requiredEnv("PHENIX_PARTENAIRE_ID");
  const payload = await phenixFetch({
    path: PHENIX_ENDPOINTS.msisdnConsultAll,
    method: "GET",
    query: { partenaireId },
  });
  const lines = extractLinesArray(payload).map(normalizeLine).filter(Boolean);

  let upserted = 0;
  for (const line of lines) {
    const { error } = await supabase.from("gsm_lines").upsert(
      {
        user_id: userId,
        msisdn: line!.msisdn,
        iccid: line!.iccid,
        operateur: line!.operateur,
        etat: line!.etat,
        partenaire_id: line!.partenaireId ?? partenaireId,
        code_client: line!.codeClient,
        nom_client: line!.nomClient,
        forfait_gsm_code: line!.forfaitGsmCode,
        code_tarif_achat: line!.codeTarifAchat,
        ip_fixe: line!.ipFixe,
        raw_payload: line!.raw,
      },
      { onConflict: "user_id,msisdn" },
    );

    if (error) {
      console.error("[phenix-maintenance] upsert gsm_lines", error);
    } else {
      upserted += 1;
    }
  }

  return { action: "sync-lines", found: lines.length, upserted };
}

function normalizeSdtrPayload(payload: unknown): {
  data: Record<string, unknown>[];
} {
  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as JsonRecord).data)
  ) {
    return { data: (payload as { data: Record<string, unknown>[] }).data };
  }
  if (Array.isArray(payload)) {
    return { data: payload as Record<string, unknown>[] };
  }
  return { data: [] };
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim()
    ? value.trim().replace(/\s+/g, " ")
    : null;
}

function formatGoLabel(value: number): string {
  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
  }).format(value)} Go`;
}

function extractRechargeGo(item: Record<string, unknown>): number | null {
  const recharge = numberOrNull(item.recharge);

  if (recharge !== null && recharge > 0) {
    return recharge >= 1024 ? round(recharge / 1024) : round(recharge);
  }

  return null;
}

function calculateSdtrUsage(payload: unknown): SdtrUsageSummary {
  const normalized = normalizeSdtrPayload(payload);
  let used = 0;
  let rest = 0;
  let hasValue = false;
  let recharge = 0;
  let hasRecharge = false;
  const rechargeLabels = new Set<string>();

  for (const item of normalized.data) {
    const usedValue = numberOrNull(item.usedValueGo);
    const restValue = numberOrNull(item.restValueGo);
    if (usedValue !== null) {
      used += usedValue;
      hasValue = true;
    }
    if (restValue !== null) {
      rest += restValue;
      hasValue = true;
    }

    const rechargeGo = extractRechargeGo(item);
    if (rechargeGo !== null) {
      recharge += rechargeGo;
      hasRecharge = true;
      rechargeLabels.add(
        stringOrNull(item.sRecharge) ??
          stringOrNull(item.rechargeText) ??
          stringOrNull(item.rechargeValueText) ??
          formatGoLabel(rechargeGo),
      );
    }
  }

  if (!hasValue) {
    return {
      usedValueGo: null,
      restValueGo: null,
      totalValueGo: null,
      usagePercent: null,
      rechargeValueGo: hasRecharge ? round(recharge) : null,
      rechargeLabel: hasRecharge
        ? Array.from(rechargeLabels).join(" + ")
        : null,
    };
  }

  const total = used + rest;
  return {
    usedValueGo: round(used),
    restValueGo: round(rest),
    totalValueGo: round(total),
    usagePercent: total > 0 ? round(Math.min(100, (used / total) * 100)) : null,
    rechargeValueGo: hasRecharge ? round(recharge) : null,
    rechargeLabel: hasRecharge ? Array.from(rechargeLabels).join(" + ") : null,
  };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
) {
  const results: R[] = [];
  let cursor = 0;

  async function runWorker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, runWorker),
  );
  return results;
}

async function refreshOneSdtrLine(line: GsmLine) {
  const payload = await phenixFetch({
    path: PHENIX_ENDPOINTS.sdtrConso,
    method: "POST",
    body: {
      msisdn: line.msisdn,
      partenaireId: line.partenaire_id ?? requiredEnv("PHENIX_PARTENAIRE_ID"),
    },
  });
  const normalized = normalizeSdtrPayload(payload);
  const usage = calculateSdtrUsage(normalized);
  const capturedAt = new Date().toISOString();

  const { error: insertError } = await supabase
    .from("gsm_line_sdtr_snapshots")
    .insert({
      user_id: line.user_id,
      line_id: line.id,
      msisdn: line.msisdn,
      captured_at: capturedAt,
      payload: normalized,
      used_value_go: usage.usedValueGo,
      rest_value_go: usage.restValueGo,
      total_value_go: usage.totalValueGo,
      usage_percent: usage.usagePercent,
      recharge_value_go: usage.rechargeValueGo,
      recharge_label: usage.rechargeLabel,
    });
  if (insertError) throw insertError;

  const { error: updateError } = await supabase
    .from("gsm_lines")
    .update({
      sdtr_conso: normalized,
      sdtr_conso_updated_at: capturedAt,
    })
    .eq("id", line.id);
  if (updateError) throw updateError;
}

async function refreshSdtr(targetMsisdn?: string) {
  const batchSize = Number(optionalEnv("SDTR_BATCH_SIZE", "50"));
  const concurrency = Math.max(1, Number(optionalEnv("SDTR_CONCURRENCY", "4")));
  const staleAfterMs = Number(optionalEnv("SDTR_STALE_AFTER_MS", "3300000"));
  const staleBefore = new Date(Date.now() - staleAfterMs).toISOString();

  let query = supabase
    .from("gsm_lines")
    .select(
      "id,user_id,msisdn,iccid,operateur,etat,partenaire_id,code_client,nom_client,forfait_gsm_code,code_tarif_achat,ip_fixe",
    )
    .order("sdtr_conso_updated_at", { ascending: true, nullsFirst: true })
    .order("msisdn", { ascending: true });

  if (targetMsisdn) {
    query = query.eq("msisdn", targetMsisdn).limit(1);
  } else {
    query = query
      .or(
        `sdtr_conso_updated_at.is.null,sdtr_conso_updated_at.lt.${staleBefore}`,
      )
      .limit(batchSize);
  }

  const { data: lines, error } = await query;

  if (error) throw error;

  const selectedLines = (lines ?? []) as GsmLine[];
  const results = await mapWithConcurrency(
    selectedLines,
    concurrency,
    async (line) => {
      try {
        await refreshOneSdtrLine(line);
        return { ok: true };
      } catch (error) {
        console.error(
          "[phenix-maintenance] refresh SDTR failed",
          line.msisdn,
          error,
        );
        return { ok: false };
      }
    },
  );
  const refreshed = results.filter((result) => result.ok).length;
  const failed = results.length - refreshed;

  return {
    action: "refresh-sdtr",
    scanned: selectedLines.length,
    refreshed,
    failed,
    batchSize,
    concurrency,
    staleBefore,
    targetMsisdn: targetMsisdn ?? null,
  };
}

function parisParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return {
    weekday: parts.weekday,
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

function timezoneOffsetMs(timeZone: string, date: Date): number {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - date.getTime();
}

function parisLocalDateToUtc(year: number, month: number, day: number) {
  let utcMs = Date.UTC(year, month - 1, day, 0, 0, 0);
  for (let index = 0; index < 2; index += 1) {
    utcMs =
      Date.UTC(year, month - 1, day, 0, 0, 0) -
      timezoneOffsetMs("Europe/Paris", new Date(utcMs));
  }
  return new Date(utcMs);
}

async function purgeSdtrIfNeeded() {
  const now = parisParts();
  if (now.weekday !== "Mon" || now.hour !== 0) {
    return {
      action: "purge-sdtr",
      skipped: true,
      reason: "outside-paris-window",
    };
  }

  const weekStartUtc = parisLocalDateToUtc(now.year, now.month, now.day);
  const { error, count } = await supabase
    .from("gsm_line_sdtr_snapshots")
    .delete({ count: "exact" })
    .lt("captured_at", weekStartUtc.toISOString());

  if (error) throw error;
  return { action: "purge-sdtr", deleted: count ?? 0 };
}

async function sendAlertsIfNeeded(force = false) {
  const now = parisParts();
  if (!force && (now.minute !== 0 || !ALERT_HOURS_PARIS.has(now.hour))) {
    return {
      action: "send-alerts",
      skipped: true,
      reason: "outside-paris-window",
    };
  }

  const { data, error } = await supabase
    .from("gsm_line_latest_sdtr")
    .select(
      "line_id,msisdn,used_value_go,rest_value_go,total_value_go,usage_percent,recharge_value_go,recharge_label,captured_at",
    )
    .gte("usage_percent", 90)
    .lte("usage_percent", 100)
    .order("usage_percent", { ascending: false });

  if (error) throw error;
  const rows = await enrichAlertRows((data ?? []) as AlertRow[]);

  if (!rows.length) {
    return { action: "send-alerts", sent: false, count: 0 };
  }

  await sendAlertEmail(rows, {
    idempotencyKey: force ? undefined : buildAlertIdempotencyKey(now),
  });

  const push = await sendPushoverNotification(rows).catch((error) => {
    console.error("[phenix-maintenance] pushover notification failed", error);
    return {
      sent: false,
      error: error instanceof Error ? error.message : "Erreur Pushover",
    };
  });

  return { action: "send-alerts", sent: true, count: rows.length, push };
}

function buildAlertIdempotencyKey(parts: ReturnType<typeof parisParts>) {
  const month = String(parts.month).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");
  const hour = String(parts.hour).padStart(2, "0");
  return `phenix-data-alerts/${parts.year}-${month}-${day}-${hour}`;
}

async function enrichAlertRows(rows: AlertRow[]) {
  const lineIds = rows
    .map((row) => row.line_id)
    .filter((lineId): lineId is string => Boolean(lineId));

  if (!lineIds.length) return rows;

  const { data, error } = await supabase
    .from("gsm_lines")
    .select("id,nom_client,code_client")
    .in("id", lineIds);

  if (error) throw error;

  const linesById = new Map(
    (data ?? []).map((line) => [
      line.id as string,
      {
        nom_client: line.nom_client as string | null,
        code_client: line.code_client as string | null,
      },
    ]),
  );

  return rows.map((row) => ({
    ...row,
    ...(row.line_id ? (linesById.get(row.line_id) ?? {}) : {}),
  }));
}

function alertLineLabel(row: AlertRow) {
  if (row.nom_client && row.code_client) {
    return `${row.nom_client} (${row.code_client})`;
  }
  return row.nom_client ?? row.code_client ?? `Ligne ${row.msisdn}`;
}

function formatParisDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date);
}

function usageBadgeStyle(value: number | string | null) {
  const percent = Number(value);

  if (Number.isFinite(percent) && percent >= 98) {
    return "display:inline-block;padding:4px 10px;border-radius:999px;background:#fee2e2;color:#991b1b;font-weight:700;";
  }

  return "display:inline-block;padding:4px 10px;border-radius:999px;background:#ffedd5;color:#9a3412;font-weight:700;";
}

function formatRecharge(row: AlertRow) {
  if (row.recharge_label) return row.recharge_label;
  if (row.recharge_value_go !== null) return `${row.recharge_value_go} Go`;
  return "—";
}

function truncateText(value: string, maxLength: number) {
  return value.length > maxLength
    ? `${value.slice(0, Math.max(0, maxLength - 1))}…`
    : value;
}

function renderPushoverMessage(rows: AlertRow[]) {
  const lines = rows.slice(0, 8).map((row) => {
    return `${alertLineLabel(row)} - ${row.msisdn}: ${row.usage_percent}% (${row.used_value_go}/${row.total_value_go} Go)`;
  });
  const remaining = rows.length - lines.length;

  return truncateText(
    [
      `${rows.length} ligne(s) DATA entre 90% et 100%.`,
      ...lines,
      ...(remaining > 0 ? [`+${remaining} autre(s) ligne(s).`] : []),
    ].join("\n"),
    1024,
  );
}

function htmlEscape(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderAlertHtml(rows: AlertRow[]) {
  const tableRows = rows
    .map(
      (row) => `
        <tr style="border-bottom:1px solid #e5e7eb;">
          <td style="padding:14px 12px;color:#111827;font-weight:600;">${htmlEscape(alertLineLabel(row))}</td>
          <td style="padding:14px 12px;color:#374151;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;">${htmlEscape(row.msisdn)}</td>
          <td style="padding:14px 12px;"><span style="${usageBadgeStyle(row.usage_percent)}">${htmlEscape(row.usage_percent)}%</span></td>
          <td style="padding:14px 12px;color:#374151;">${htmlEscape(row.used_value_go)} / ${htmlEscape(row.total_value_go)} Go</td>
          <td style="padding:14px 12px;color:#374151;">${htmlEscape(formatRecharge(row))}</td>
          <td style="padding:14px 12px;color:#6b7280;">${htmlEscape(formatParisDate(row.captured_at))} <span style="white-space:nowrap;">Europe/Paris</span></td>
        </tr>
      `,
    )
    .join("");

  return `
    <div style="margin:0;background:#f3f4f6;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#111827;">
      <div style="max-width:920px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
        <div style="padding:24px 28px;background:#111827;color:#ffffff;">
          <p style="margin:0 0 8px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#fbbf24;font-weight:700;">PHENIX DATA</p>
          <h1 style="margin:0;font-size:24px;line-height:1.25;">Alertes consommation DATA</h1>
          <p style="margin:10px 0 0;color:#d1d5db;font-size:15px;">${rows.length} ligne(s) ont une consommation comprise entre 90% et 100%.</p>
        </div>
        <div style="padding:22px 28px;">
          <p style="margin:0 0 18px;color:#4b5563;font-size:14px;line-height:1.6;">
            Les relevés ci-dessous sont affichés en heure de Paris.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;font-size:14px;">
            <thead>
        <tr style="background:#f9fafb;border-bottom:1px solid #e5e7eb;">
          <th align="left" style="padding:12px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.04em;">Client / ligne</th>
          <th align="left" style="padding:12px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.04em;">MSISDN</th>
          <th align="left" style="padding:12px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.04em;">Usage</th>
          <th align="left" style="padding:12px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.04em;">Utilisé / total</th>
          <th align="left" style="padding:12px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.04em;">Recharge</th>
          <th align="left" style="padding:12px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.04em;">Dernier relevé</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
          <p style="margin:18px 0 0;color:#6b7280;font-size:12px;line-height:1.5;">
            Email généré automatiquement par la maintenance PHENIX.
          </p>
        </div>
      </div>
    </div>
  `;
}

async function sendAlertEmail(
  rows: AlertRow[],
  options: { idempotencyKey?: string } = {},
) {
  const apiKey = requiredEnv("RESEND_API_KEY");
  const from = requiredEnv("RESEND_FROM");
  const to = requiredEnv("ALERT_ADMIN_EMAIL");
  const timeoutMs = Number(
    optionalEnv("RESEND_TIMEOUT_MS", String(DEFAULT_RESEND_TIMEOUT_MS)),
  );
  const subject = `[PHENIX] ${rows.length} ligne(s) DATA entre 90% et 100%`;
  const text = rows
    .map(
      (row) =>
        `${alertLineLabel(row)} - ${row.msisdn} - ${row.usage_percent}% - ${row.used_value_go}/${row.total_value_go} Go - recharge: ${formatRecharge(row)} - ${formatParisDate(row.captured_at)} Europe/Paris`,
    )
    .join("\n");
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  if (options.idempotencyKey) {
    headers["Idempotency-Key"] = options.idempotencyKey;
  }

  const response = await fetchWithTimeout(
    "https://api.resend.com/emails",
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text,
        html: renderAlertHtml(rows),
      }),
    },
    timeoutMs,
  );

  if (!response.ok) {
    const content = await response.text().catch(() => "");
    throw new Error(
      `Resend a refusé l'email (${response.status}): ${content || response.statusText}`,
    );
  }
}

async function sendPushoverNotification(rows: AlertRow[]) {
  const token = optionalEnv("PUSHOVER_APP_TOKEN");
  const user = optionalEnv("PUSHOVER_USER_KEY");

  if (!token || !user) {
    return {
      sent: false,
      skipped: true,
      reason: "missing-pushover-secrets",
    };
  }

  const body = new URLSearchParams({
    token,
    user,
    title: truncateText(`[PHENIX] ${rows.length} alerte(s) DATA`, 250),
    message: renderPushoverMessage(rows),
    priority: optionalEnv("PUSHOVER_PRIORITY", "1"),
  });
  const device = optionalEnv("PUSHOVER_DEVICE");
  const sound = optionalEnv("PUSHOVER_SOUND");

  if (device) body.set("device", device);
  if (sound) body.set("sound", sound);

  const response = await fetchWithTimeout(
    "https://api.pushover.net/1/messages.json",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
    Number(
      optionalEnv("PUSHOVER_TIMEOUT_MS", String(DEFAULT_PUSHOVER_TIMEOUT_MS)),
    ),
  );

  const payload = (await response.json().catch(() => null)) as {
    request?: string;
    errors?: string[];
  } | null;

  if (!response.ok) {
    throw new Error(
      `Pushover a refusé la notification (${response.status}): ${
        payload?.errors?.join(", ") || response.statusText
      }`,
    );
  }

  return {
    sent: true,
    request: payload?.request ?? null,
  };
}
