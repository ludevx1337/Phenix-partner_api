import { describe, expect, it } from "vitest";
import { extractLinesFromResponse, normalizeGsmLineRow } from "@/lib/phenix/normalize";

describe("normalizeGsmLineRow", () => {
  it("extrait msisdn depuis champs camelCase", () => {
    const row = normalizeGsmLineRow({ msisdn: "+331", operateur: "ORANGE" });
    expect(row?.msisdn).toBe("+331");
    expect(row?.operateur).toBe("ORANGE");
  });

  it("priorise etatLibelle sur etat pour l’affichage", () => {
    const row = normalizeGsmLineRow({
      msisdn: "+33700",
      etat: "RES",
      etatLibelle: "Résiliée",
    });
    expect(row?.etat).toBe("Résiliée");
  });

  it("extrait champs catalogue PHENIX (client, forfait, tarif, IP)", () => {
    const row = normalizeGsmLineRow({
      msisdn: "+33601020304",
      nomClient: "ACME",
      forfaitGsmCode: "CD-GSM-B29",
      codeTarifAchat: "GSM-SO1853-F",
      ipFixe: "",
    });
    expect(row?.nomClient).toBe("ACME");
    expect(row?.forfaitGsmCode).toBe("CD-GSM-B29");
    expect(row?.codeTarifAchat).toBe("GSM-SO1853-F");
    expect(row?.ipFixe).toBe("");
  });
});

describe("extractLinesFromResponse", () => {
  it("lit un tableau racine", () => {
    const lines = extractLinesFromResponse([{ msisdn: "+33999" }]);
    expect(lines[0]?.msisdn).toBe("+33999");
  });

  it("lit une enveloppe items", () => {
    const lines = extractLinesFromResponse({
      items: [{ Msisdn: "+33888" }],
    });
    expect(lines[0]?.msisdn).toBe("+33888");
  });
});
