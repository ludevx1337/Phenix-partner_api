import { handleRouteError } from "@/lib/api/handle-route-error";
import { getAuthenticatedUser } from "@/lib/api/phenix-route";
import { phenixFetch } from "@/lib/phenix/client";
import { PhenixEndpoints } from "@/lib/phenix/endpoints";
import { msisdnAddDataRechargeBodySchema } from "@/lib/phenix/schemas";
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
    const body = msisdnAddDataRechargeBodySchema.parse(json);
    const partenaireId = await resolvePartenaireId(body.partenaireId);

    const data = await phenixFetch({
      path: PhenixEndpoints.msisdnAddDataRecharge,
      method: "POST",
      body: {
        msisdn: body.msisdn,
        codeZone: body.codeZone,
        codeRecharge: body.codeRecharge,
        ...(body.volumeDataEnMo ? { volumeDataEnMo: body.volumeDataEnMo } : {}),
        partenaireId,
      },
      schema: z.unknown(),
      userId: user.id,
    });

    const supabase = await createClient();
    await supabase.from("data_recharges").insert({
      user_id: user.id,
      msisdn: body.msisdn,
      zone: body.codeZone,
      code_recharge: body.codeRecharge,
      statut: "ok",
      partenaire_id: partenaireId ?? null,
      raw_payload: data as object,
    });

    await supabase.from("data_recharge_history").insert({
      user_id: user.id,
      msisdn: body.msisdn,
      action: "add_data_recharge",
      payload: body as object,
      status: "ok",
    });

    return NextResponse.json({ data });
  } catch (e) {
    return handleRouteError(e);
  }
}
