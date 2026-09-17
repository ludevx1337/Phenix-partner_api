import { z } from "zod";

/** Élément zone retourné par SdtrConso (champs partiellement optionnels pour tolérance API). */
export const sdtrZoneItemSchema = z
  .object({
    id: z.string().optional(),
    msisdn: z.string().optional(),
    codeZone: z.string().optional(),
    libelleZone: z.string().optional(),
    descriptionZone: z.string().optional(),
    optionType: z.string().optional(),
    isMontant: z.boolean().optional(),
    remainingValue: z.number().optional(),
    remainingValueText: z.string().optional(),
    sRemainingValue: z.string().optional(),
    usedValue: z.number().optional(),
    usedValueText: z.string().optional(),
    sUsedValue: z.string().optional(),
    usedValueGo: z.number().optional(),
    initialValue: z.number().optional(),
    initialValueText: z.string().optional(),
    sInitialValue: z.string().optional(),
    recharge: z.number().optional(),
    sRecharge: z.string().optional(),
    rechargeGo: z.number().optional(),
    restValue: z.number().optional(),
    restValueText: z.string().optional(),
    restValueGo: z.number().optional(),
    libelleZoneValue: z.string().optional(),
    libelleZoneText: z.string().optional(),
    isCutOff: z.boolean().optional(),
  })
  .passthrough();

export type SdtrZoneItem = z.infer<typeof sdtrZoneItemSchema>;

const envelopeSchema = z.object({
  data: z.array(sdtrZoneItemSchema),
});

/** Normalise la réponse PHENIX vers `{ data: SdtrZoneItem[] }`. */
export function normalizeSdtrConsoPayload(raw: unknown): {
  data: SdtrZoneItem[];
} {
  const asEnv = envelopeSchema.safeParse(raw);
  if (asEnv.success) {
    return { data: asEnv.data.data };
  }
  const asArr = z.array(sdtrZoneItemSchema).safeParse(raw);
  if (asArr.success) {
    return { data: asArr.data };
  }
  return { data: [] };
}
