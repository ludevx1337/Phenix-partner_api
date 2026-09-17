import { handleRouteError } from "@/lib/api/handle-route-error";
import { getAuthenticatedUser } from "@/lib/api/phenix-route";
import { phenixFetch } from "@/lib/phenix/client";
import { PhenixEndpoints } from "@/lib/phenix/endpoints";
import { operateurParamSchema } from "@/lib/phenix/schemas";
import { resolvePartenaireId } from "@/lib/phenix/secure-config";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedUser();
    if ("error" in auth) return auth.error;
    const { user } = auth;

    const { searchParams } = new URL(request.url);
    const operateur = searchParams.get("operateur");
    const parsed = operateurParamSchema.parse({ operateur });

    const partenaireId = await resolvePartenaireId();

    const data = await phenixFetch({
      path: PhenixEndpoints.getZonesByOperator,
      method: "GET",
      query: {
        operateur: parsed.operateur,
        partenaireId,
      },
      schema: z.unknown(),
      userId: user.id,
    });

    return NextResponse.json({ data });
  } catch (e) {
    return handleRouteError(e);
  }
}
