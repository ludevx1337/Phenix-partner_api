import { z } from "zod";
import { getPhenixToken, invalidatePhenixToken, maskSensitive } from "@/lib/phenix/auth";
import { createClient } from "@/lib/supabase/server";

function getBaseUrl(): string {
  const base =
    process.env.PHENIX_API_BASE_URL ?? "https://api.phenix-partner.fr";
  return base.replace(/\/$/, "");
}

export class PhenixApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "PhenixApiError";
    this.status = status;
    this.body = body;
  }
}

async function insertApiLog(params: {
  userId: string;
  endpoint: string;
  method: string;
  requestPayload: unknown;
  responseStatus: number | null;
  responsePayload: unknown;
  durationMs: number;
  requestId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
}): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from("phenix_api_logs").insert({
      user_id: params.userId,
      endpoint: params.endpoint,
      method: params.method,
      request_payload: maskSensitive(params.requestPayload) as object,
      response_status: params.responseStatus,
      response_payload: maskSensitive(params.responsePayload) as object,
      duration_ms: params.durationMs,
      request_id: params.requestId,
      error_code: params.errorCode,
      error_message: params.errorMessage,
    });
  } catch (e) {
    console.error("[phenix] insertApiLog failed", e);
  }
}

function parseJsonSafe(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { _raw: text };
  }
}

/**
 * Appel API PHENIX centralisé : Bearer, retry 401, log Supabase, validation Zod.
 */
export async function phenixFetch<T>(options: {
  path: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  schema: z.ZodType<T>;
  userId: string;
}): Promise<T> {
  const method = options.method ?? "GET";
  const url = new URL(`${getBaseUrl()}${options.path.startsWith("/") ? options.path : `/${options.path}`}`);
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }

  const doRequest = async (token: string) => {
    const headers: HeadersInit = {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    };
    let bodyStr: string | undefined;
    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
      bodyStr = JSON.stringify(options.body);
    }
    const started = Date.now();
    const res = await fetch(url.toString(), {
      method,
      headers,
      body: bodyStr,
      cache: "no-store",
    });
    const text = await res.text();
    const json = text ? parseJsonSafe(text) : null;
    const durationMs = Date.now() - started;
    return { res, json, durationMs };
  };

  let token = await getPhenixToken();
  let { res, json, durationMs } = await doRequest(token);

  if (res.status === 401) {
    invalidatePhenixToken();
    token = await getPhenixToken();
    ({ res, json, durationMs } = await doRequest(token));
  }

  const requestId =
    typeof json === "object" &&
    json !== null &&
    "requestId" in json &&
    typeof (json as { requestId?: unknown }).requestId === "string"
      ? (json as { requestId: string }).requestId
      : typeof json === "object" &&
          json !== null &&
          "RequestId" in json &&
          typeof (json as { RequestId?: unknown }).RequestId === "string"
        ? (json as { RequestId: string }).RequestId
        : null;

  if (!res.ok) {
    await insertApiLog({
      userId: options.userId,
      endpoint: url.pathname,
      method,
      requestPayload: options.body ?? options.query ?? {},
      responseStatus: res.status,
      responsePayload: json,
      durationMs,
      requestId,
      errorCode: String(res.status),
      errorMessage: res.statusText,
    });
    throw new PhenixApiError(
      `PHENIX ${method} ${url.pathname} → ${res.status}`,
      res.status,
      json,
    );
  }

  const parsed = options.schema.parse(json);

  await insertApiLog({
    userId: options.userId,
    endpoint: url.pathname,
    method,
    requestPayload: options.body ?? options.query ?? {},
    responseStatus: res.status,
    responsePayload: json,
    durationMs,
    requestId,
      errorCode: null,
      errorMessage: null,
  });

  return parsed;
}
