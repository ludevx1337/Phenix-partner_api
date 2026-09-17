import "server-only";
import { resolvePartenaireId } from "@/lib/phenix/secure-config";

/** Fusionne le JSON client avec un `partenaireId` résolu (config / .env). */
export async function jsonBodyWithPartenaireId(
  request: Request,
): Promise<Record<string, unknown>> {
  const raw = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const override =
    typeof raw.partenaireId === "string" ? raw.partenaireId : undefined;
  const partenaireId = await resolvePartenaireId(override);
  return { ...raw, partenaireId };
}
