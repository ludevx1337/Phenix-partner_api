import { handleRouteError } from "@/lib/api/handle-route-error";
import { getAuthenticatedUser } from "@/lib/api/phenix-route";
import { phenixFetch } from "@/lib/phenix/client";
import { PhenixEndpoints } from "@/lib/phenix/endpoints";
import { msisdnResumeBodySchema } from "@/lib/phenix/schemas";
import { resolvePartenaireId } from "@/lib/phenix/secure-config";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUser();
    if ("error" in auth) return auth.error;
    const { user } = auth;

    const json: unknown = await request.json().catch(() => ({}));
    const body = msisdnResumeBodySchema.parse(json);
    const partenaireId = await resolvePartenaireId(body.partenaireId);

    const data = await phenixFetch({
      path: PhenixEndpoints.msisdnResume,
      method: "POST",
      body: {
        msisdn: body.msisdn,
        partenaireId,
        ...(body.requestId ? { requestId: body.requestId } : {}),
      },
      schema: z.unknown(),
      userId: user.id,
    });

    const supabase = await createClient();
    await supabase.from("gsm_line_history").insert({
      user_id: user.id,
      msisdn: body.msisdn,
      action: "resume",
      payload: body as object,
      status: "ok",
    });

    return NextResponse.json({ data });
  } catch (e) {
    return handleRouteError(e);
  }
}
