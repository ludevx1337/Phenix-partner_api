import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

export const notificationPayloadSchema = z.record(z.string(), z.unknown());

export function verifyWebhookSecret(request: NextRequest):
  | { ok: true }
  | { ok: false; response: NextResponse } {
  const secret = process.env.PHENIX_WEBHOOK_SECRET;
  if (!secret || secret.length < 8) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "PHENIX_WEBHOOK_SECRET manquant ou trop court" },
        { status: 500 },
      ),
    };
  }
  const token = request.headers.get("x-webhook-token");
  if (token !== secret) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { ok: true };
}

export async function persistNotification(
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("notifications").insert({
    event_type: eventType,
    payload,
    user_id: null,
  });
  if (error) {
    console.error("[notifications] insert error", error);
    throw error;
  }
}
