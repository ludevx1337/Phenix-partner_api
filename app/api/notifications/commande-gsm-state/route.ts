import { persistNotification, notificationPayloadSchema, verifyWebhookSecret } from "@/lib/notifications/webhook";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const v = verifyWebhookSecret(request);
  if (!v.ok) return v.response;
  const json: unknown = await request.json().catch(() => ({}));
  const payload = notificationPayloadSchema.parse(json);
  await persistNotification("commande-gsm-state", payload);
  return NextResponse.json({ ok: true }, { status: 200 });
}
