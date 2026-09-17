import { handleRouteError } from "@/lib/api/handle-route-error";
import { getAuthenticatedUser } from "@/lib/api/phenix-route";
import { phenixFetch } from "@/lib/phenix/client";
import { PhenixEndpoints } from "@/lib/phenix/endpoints";
import { extractLinesFromResponse } from "@/lib/phenix/normalize";
import { resolvePartenaireId } from "@/lib/phenix/secure-config";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function GET() {
  try {
    const auth = await getAuthenticatedUser();
    if ("error" in auth) return auth.error;
    const { user } = auth;
    const partenaireId = await resolvePartenaireId();

    const data = await phenixFetch({
      path: PhenixEndpoints.msisdnConsultAll,
      method: "GET",
      query: { partenaireId },
      schema: z.unknown(),
      userId: user.id,
    });

    const lines = extractLinesFromResponse(data);
    const supabase = await createClient();

    for (const line of lines) {
      const { error } = await supabase.from("gsm_lines").upsert(
        {
          user_id: user.id,
          msisdn: line.msisdn,
          iccid: line.iccid ?? null,
          operateur: line.operateur ?? null,
          etat: line.etat ?? null,
          partenaire_id: line.partenaireId ?? partenaireId ?? null,
          code_client: line.codeClient ?? null,
          nom_client: line.nomClient ?? null,
          forfait_gsm_code: line.forfaitGsmCode ?? null,
          code_tarif_achat: line.codeTarifAchat ?? null,
          ip_fixe: line.ipFixe ?? null,
          raw_payload: (line.raw ?? {}) as object,
        },
        { onConflict: "user_id,msisdn" },
      );
      if (error) {
        console.error("[consult-all] upsert gsm_lines", error);
      }
    }

    return NextResponse.json({ data, lines });
  } catch (e) {
    return handleRouteError(e);
  }
}
