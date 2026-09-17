import type { GsmLineRow } from "@/lib/phenix/types";

function pickStr(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return undefined;
}

/** Comme `pickStr` mais accepte `""` (ex. `ipFixe`, `nomClient` vides côté PHENIX). */
function pickStrAllowEmpty(
  obj: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string") return v;
  }
  return undefined;
}

/** Normalise une entrée ligne depuis la réponse PHENIX (champs variables). */
export function normalizeGsmLineRow(raw: unknown): GsmLineRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const msisdn =
    pickStr(o, ["msisdn", "Msisdn", "MSISDN", "numero", "Numero"]) ?? "";
  if (!msisdn) return null;
  return {
    msisdn,
    iccid: pickStr(o, ["iccid", "Iccid", "ICCID", "simSerial", "SimSerial"]),
    operateur: pickStr(o, [
      "operateur",
      "Operateur",
      "operator",
      "Operator",
      "operateurId",
    ]),
    // Libellé lisible en priorité (ex. « Résiliée ») ; `etat` seul est souvent un code peu parlant.
    etat: pickStr(o, [
      "etatLibelle",
      "EtatLibelle",
      "etat_libelle",
      "Etat_Libelle",
      "etat",
      "Etat",
      "state",
      "State",
      "statut",
      "Statut",
    ]),
    partenaireId: pickStr(o, ["partenaireId", "PartenaireId", "partenaire_id"]),
    codeClient: pickStr(o, ["codeClient", "CodeClient", "code_client"]),
    nomClient: pickStrAllowEmpty(o, [
      "nomClient",
      "NomClient",
      "nom_client",
      "Nom",
    ]),
    forfaitGsmCode: pickStrAllowEmpty(o, [
      "forfaitGsmCode",
      "ForfaitGsmCode",
      "forfait_gsm_code",
      "codeForfait",
      "CodeForfait",
    ]),
    codeTarifAchat: pickStrAllowEmpty(o, [
      "codeTarifAchat",
      "CodeTarifAchat",
      "code_tarif_achat",
      "tarifAchat",
      "TarifAchat",
    ]),
    ipFixe: pickStrAllowEmpty(o, [
      "ipFixe",
      "IpFixe",
      "ip_fixe",
      "ipFixeGsm",
    ]),
    raw: o,
  };
}

export function extractLinesArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    const candidates = [
      d.lines,
      d.Lines,
      d.items,
      d.Items,
      d.data,
      d.Data,
      d.result,
      d.Result,
      d.msisdns,
      d.Msisdns,
    ];
    for (const c of candidates) {
      if (Array.isArray(c)) return c;
    }
  }
  return [];
}

export function extractLinesFromResponse(data: unknown): GsmLineRow[] {
  return extractLinesArray(data)
    .map(normalizeGsmLineRow)
    .filter((x): x is GsmLineRow => x !== null);
}
