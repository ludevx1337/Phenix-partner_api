import { PhenixApiError } from "@/lib/phenix/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function handleRouteError(e: unknown): NextResponse {
  if (e instanceof ZodError) {
    return NextResponse.json(
      { error: "Validation", issues: e.flatten() },
      { status: 400 },
    );
  }
  if (e instanceof PhenixApiError) {
    return NextResponse.json(
      { error: e.message, details: e.body },
      { status: 502 },
    );
  }
  console.error("[api]", e);
  return NextResponse.json(
    { error: e instanceof Error ? e.message : "Erreur interne" },
    { status: 500 },
  );
}
