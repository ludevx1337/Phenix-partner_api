import "server-only";
import { handleRouteError } from "@/lib/api/handle-route-error";
import { getAuthenticatedUser } from "@/lib/api/phenix-route";
import { searchParamsWithPartenaireId } from "@/lib/api/phenix-get-query";
import { jsonBodyWithPartenaireId } from "@/lib/phenix/api-merge";
import { phenixFetch } from "@/lib/phenix/client";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function phenixProxyGet(
  request: Request,
  path: string,
): Promise<Response> {
  try {
    const auth = await getAuthenticatedUser();
    if ("error" in auth) return auth.error;
    const query = await searchParamsWithPartenaireId(request);
    const data = await phenixFetch({
      path,
      method: "GET",
      query,
      schema: z.unknown(),
      userId: auth.user.id,
    });
    return NextResponse.json({ data });
  } catch (e) {
    return handleRouteError(e);
  }
}

export async function phenixProxyPost(
  request: Request,
  path: string,
): Promise<Response> {
  try {
    const auth = await getAuthenticatedUser();
    if ("error" in auth) return auth.error;
    const body = await jsonBodyWithPartenaireId(request);
    const data = await phenixFetch({
      path,
      method: "POST",
      body,
      schema: z.unknown(),
      userId: auth.user.id,
    });
    return NextResponse.json({ data });
  } catch (e) {
    return handleRouteError(e);
  }
}
