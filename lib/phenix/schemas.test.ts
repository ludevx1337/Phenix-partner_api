import { describe, expect, it } from "vitest";
import { loginSchema } from "@/lib/schemas/auth-login";
import {
  msisdnAddDataRechargeBodySchema,
  msisdnParamSchema,
  operateurParamSchema,
} from "@/lib/phenix/schemas";

describe("msisdnParamSchema", () => {
  it("accepte un MSISDN numérique", () => {
    expect(msisdnParamSchema.parse({ msisdn: "+33601020304" }).msisdn).toBe(
      "+33601020304",
    );
  });

  it("rejette un MSISDN invalide", () => {
    expect(() => msisdnParamSchema.parse({ msisdn: "abc" })).toThrow();
  });
});

describe("operateurParamSchema", () => {
  it("accepte ORANGE", () => {
    expect(operateurParamSchema.parse({ operateur: "ORANGE" }).operateur).toBe(
      "ORANGE",
    );
  });
});

describe("loginSchema", () => {
  it("valide email + password", () => {
    const v = loginSchema.parse({ email: "a@b.co", password: "secret1" });
    expect(v.email).toBe("a@b.co");
  });
});

describe("msisdnAddDataRechargeBodySchema", () => {
  it("mappe codeZone et volumeDataEnMo", () => {
    const v = msisdnAddDataRechargeBodySchema.parse({
      msisdn: "+33600000000",
      operateur: "ORANGE",
      codeZone: "ZoneA",
      codeRecharge: "RECH-DATA-1GO",
      volumeDataEnMo: 1024,
    });
    expect(v.codeZone).toBe("ZoneA");
    expect(v.volumeDataEnMo).toBe("1024");
  });
});
