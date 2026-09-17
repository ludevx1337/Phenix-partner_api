import "server-only";
import { resolvePartenaireId } from "@/lib/phenix/secure-config";

/** Fusionne les query params de l’URL avec un `partenaireId` résolu. */
export async function searchParamsWithPartenaireId(
  request: Request,
): Promise<Record<string, string>> {
  const url = new URL(request.url);
  const raw: Record<string, string> = {};
  url.searchParams.forEach((v, k) => {
    raw[k] = v;
  });
  const override =
    typeof raw.partenaireId === "string" ? raw.partenaireId : undefined;
  const partenaireId = await resolvePartenaireId(override);
  return { ...raw, partenaireId };
}
