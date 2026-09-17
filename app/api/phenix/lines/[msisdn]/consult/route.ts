import { handleRouteError } from "@/lib/api/handle-route-error";
import { getAuthenticatedUser } from "@/lib/api/phenix-route";
import { phenixFetch } from "@/lib/phenix/client";
import { PhenixEndpoints } from "@/lib/phenix/endpoints";
import { msisdnParamSchema } from "@/lib/phenix/schemas";
import { resolvePartenaireId } from "@/lib/phenix/secure-config";
import { NextResponse } from "next/server";
import { z } from "zod";

type RouteContext = { params: Promise<{ msisdn: string }> };

export async function GET(_req: Request, context: RouteContext) {
  try {
    const auth = await getAuthenticatedUser();
    if ("error" in auth) return auth.error;
    const { user } = auth;
    const { msisdn: raw } = await context.params;
    const msisdn = decodeURIComponent(raw);
    msisdnParamSchema.parse({ msisdn });

    const partenaireId = await resolvePartenaireId();
    const data = await phenixFetch({
      path: PhenixEndpoints.msisdnConsult,
      method: "GET",
      query: {
        msisdn,
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
