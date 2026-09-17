import { z } from "zod";

/** Réponse auth PHENIX (plusieurs cas possibles selon version API). */
export const phenixAuthResponseSchema = z
  .object({
    access_token: z.string().optional(),
    Access_token: z.string().optional(),
    token: z.string().optional(),
    Token: z.string().optional(),
    expires_in: z.number().optional(),
    expiresIn: z.number().optional(),
  })
  .passthrough();

export type PhenixAuthResponse = z.infer<typeof phenixAuthResponseSchema>;

export const msisdnParamSchema = z.object({
  msisdn: z
    .string()
    .min(8, "MSISDN invalide")
    .max(20, "MSISDN invalide")
    .regex(/^\+?[0-9]+$/, "MSISDN doit être numérique"),
});

export const operateurParamSchema = z.object({
  operateur: z.enum(["ORANGE", "SFR", "BTBD", "PHENIX"]),
});

export const codeZoneParamSchema = z.object({
  codeZone: z.string().min(1, "codeZone requis").optional(),
});

export const msisdnSuspendBodySchema = z.object({
  msisdn: msisdnParamSchema.shape.msisdn,
  partenaireId: z.string().optional(),
  requestId: z.string().optional(),
});

export const msisdnResumeBodySchema = msisdnSuspendBodySchema;

export const msisdnAddDataRechargeBodySchema = z.object({
  msisdn: msisdnParamSchema.shape.msisdn,
  operateur: operateurParamSchema.shape.operateur,
  codeZone: z.string().min(1, "Code zone requis"),
  codeRecharge: z.string().min(1, "Code recharge requis"),
  volumeDataEnMo: z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    z
      .union([z.string().min(1), z.number().int().positive()])
      .optional()
      .transform((v) => (typeof v === "number" ? String(v) : v)),
  ),
  partenaireId: z.string().optional(),
});

/** Réponses API : structure souvent tableau ou enveloppe — assouplir. */
export const phenixUnknownJsonSchema = z.unknown();

export const phenixArrayOrObjectSchema = z.union([
  z.array(z.record(z.string(), z.unknown())),
  z.record(z.string(), z.unknown()),
]);
