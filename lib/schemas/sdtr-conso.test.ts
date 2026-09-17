import { describe, expect, it } from "vitest";
import { normalizeSdtrConsoPayload } from "./sdtr-conso";

describe("normalizeSdtrConsoPayload", () => {
  it("accepte l’enveloppe { data: [...] }", () => {
    const raw = {
      data: [
        { id: "Z1", usedValueGo: 1, restValueGo: 9, libelleZoneText: "France" },
      ],
    };
    const r = normalizeSdtrConsoPayload(raw);
    expect(r.data).toHaveLength(1);
    expect(r.data[0]?.id).toBe("Z1");
  });

  it("accepte un tableau racine", () => {
    const raw = [{ id: "A" }, { id: "B" }];
    const r = normalizeSdtrConsoPayload(raw);
    expect(r.data).toHaveLength(2);
  });

  it("retourne [] si forme inconnue", () => {
    expect(normalizeSdtrConsoPayload({ foo: 1 }).data).toEqual([]);
  });
});
