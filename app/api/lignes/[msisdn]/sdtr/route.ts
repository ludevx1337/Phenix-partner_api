import { handleRouteError } from "@/lib/api/handle-route-error";
import { getAuthenticatedUser } from "@/lib/api/phenix-route";
import { phenixFetch } from "@/lib/phenix/client";
import { PhenixEndpoints } from "@/lib/phenix/endpoints";
import { resolvePartenaireId } from "@/lib/phenix/secure-config";
import {
  normalizeSdtrConsoPayload,
  sdtrZoneItemSchema,
} from "@/lib/schemas/sdtr-conso";
import { createClient } from "@/lib/supabase/server";
import { msisdnParamSchema } from "@/lib/phenix/schemas";
import { NextResponse } from "next/server";
import { z } from "zod";

type RouteContext = { params: Promise<{ msisdn: string }> };

/**
 * Synchronise SdtrConso pour une ligne : appel PHENIX, persistance `gsm_lines.sdtr_conso`,
 * renvoie le snapshot normalisé (fiche ligne — chargement client).
 */
export async function POST(_request: Request, context: RouteContext) {
  try {
    const auth = await getAuthenticatedUser();
    if ("error" in auth) return auth.error;

    const { msisdn: msisdnParam } = await context.params;
    const msisdn = decodeURIComponent(msisdnParam);
    msisdnParamSchema.parse({ msisdn });

    const supabase = await createClient();
    const { data: line, error: lineErr } = await supabase
      .from("gsm_lines")
      .select("id")
      .eq("user_id", auth.user.id)
      .eq("msisdn", msisdn)
      .maybeSingle();

    if (lineErr) {
      return NextResponse.json(
        { error: "Lecture ligne impossible" },
        { status: 500 },
      );
    }
    if (!line) {
      return NextResponse.json({ error: "Ligne introuvable" }, { status: 404 });
    }

    const partenaireId = await resolvePartenaireId();
    const phenixBody = await phenixFetch({
      path: PhenixEndpoints.sdtrConso,
      method: "POST",
      body: { msisdn, partenaireId },
      schema: z.unknown(),
      userId: auth.user.id,
    });

    const normalized = normalizeSdtrConsoPayload(phenixBody);
    const safeData = normalized.data.flatMap((item) => {
      const r = sdtrZoneItemSchema.safeParse(item);
      return r.success ? [r.data] : [];
    });
    const toStore = { data: safeData };

    const { error: upErr } = await supabase
      .from("gsm_lines")
      .update({
        sdtr_conso: toStore as object,
        sdtr_conso_updated_at: new Date().toISOString(),
      })
      .eq("user_id", auth.user.id)
      .eq("msisdn", msisdn);

    if (upErr) {
      return NextResponse.json({
        data: toStore,
        updatedAt: null as string | null,
        persisted: false,
        warning: "Réponse PHENIX reçue mais enregistrement BDD impossible.",
      });
    }

    const updatedAt = new Date().toISOString();
    return NextResponse.json({
      data: toStore,
      updatedAt,
      persisted: true,
    });
  } catch (e) {
    return handleRouteError(e);
  }
}
