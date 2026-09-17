export type EtatCategory = "active" | "suspend" | "resilie" | "other";

export function classifyEtat(etat: string | null | undefined): EtatCategory {
  const e = (etat ?? "").toLowerCase();
  if (e.includes("susp")) return "suspend";
  if (e.includes("résil") || e.includes("resil")) return "resilie";
  if (e.includes("act") || e.includes("ok") || e.includes("live")) return "active";
  return "other";
}
