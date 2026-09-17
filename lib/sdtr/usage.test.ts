import { describe, expect, it } from "vitest";
import { calculateSdtrUsage } from "./usage";

describe("calculateSdtrUsage", () => {
  it("calcule un forfait intact 0/100", () => {
    expect(
      calculateSdtrUsage({
        data: [{ usedValueGo: 0, restValueGo: 100 }],
      }),
    ).toEqual({
      usedValueGo: 0,
      restValueGo: 100,
      totalValueGo: 100,
      usagePercent: 0,
      rechargeValueGo: null,
      rechargeLabel: null,
    });
  });

  it("calcule un ratio utilisé sur total disponible", () => {
    expect(
      calculateSdtrUsage({
        data: [{ usedValueGo: 50, restValueGo: 10 }],
      }),
    ).toEqual({
      usedValueGo: 50,
      restValueGo: 10,
      totalValueGo: 60,
      usagePercent: 83.33,
      rechargeValueGo: null,
      rechargeLabel: null,
    });
  });

  it("agrège plusieurs zones SDTR", () => {
    expect(
      calculateSdtrUsage({
        data: [
          { usedValueGo: 20, restValueGo: 5 },
          { usedValueGo: 5, restValueGo: 20 },
        ],
      }),
    ).toEqual({
      usedValueGo: 25,
      restValueGo: 25,
      totalValueGo: 50,
      usagePercent: 50,
      rechargeValueGo: null,
      rechargeLabel: null,
    });
  });

  it("détecte une recharge sans fausser le pourcentage", () => {
    expect(
      calculateSdtrUsage({
        data: [
          {
            usedValueGo: 20,
            restValueGo: 50,
            recharge: 51200,
            sRecharge: "50 Go",
            rechargeGo: 70,
          },
        ],
      }),
    ).toEqual({
      usedValueGo: 20,
      restValueGo: 50,
      totalValueGo: 70,
      usagePercent: 28.57,
      rechargeValueGo: 50,
      rechargeLabel: "50 Go",
    });
  });

  it("tolère les données manquantes", () => {
    expect(calculateSdtrUsage({ data: [{}] })).toEqual({
      usedValueGo: null,
      restValueGo: null,
      totalValueGo: null,
      usagePercent: null,
      rechargeValueGo: null,
      rechargeLabel: null,
    });
  });
});
