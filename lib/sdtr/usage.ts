import { z } from "zod";

const maybeNumber = z.preprocess((value) => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const normalized = value.replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : value;
  }
  return value;
}, z.number().finite().optional());

export const sdtrUsageZoneSchema = z
  .object({
    usedValueGo: maybeNumber,
    restValueGo: maybeNumber,
    recharge: maybeNumber,
    sRecharge: z.string().optional(),
    rechargeText: z.string().optional(),
    rechargeValueText: z.string().optional(),
  })
  .passthrough();

const sdtrEnvelopeSchema = z.object({
  data: z.array(sdtrUsageZoneSchema),
});

export type SdtrUsageSummary = {
  usedValueGo: number | null;
  restValueGo: number | null;
  totalValueGo: number | null;
  usagePercent: number | null;
  rechargeValueGo: number | null;
  rechargeLabel: string | null;
};

export function roundSdtrNumber(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeSdtrLabel(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/\s+/g, " ") : null;
}

function formatGoLabel(value: number): string {
  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
  }).format(value)} Go`;
}

function extractRechargeGo(
  zone: z.infer<typeof sdtrUsageZoneSchema>,
): number | null {
  if (typeof zone.recharge === "number" && zone.recharge > 0) {
    return zone.recharge >= 1024
      ? roundSdtrNumber(zone.recharge / 1024)
      : roundSdtrNumber(zone.recharge);
  }

  return null;
}

export function normalizeSdtrUsagePayload(raw: unknown): {
  data: z.infer<typeof sdtrUsageZoneSchema>[];
} {
  const envelope = sdtrEnvelopeSchema.safeParse(raw);
  if (envelope.success) {
    return { data: envelope.data.data };
  }

  const array = z.array(sdtrUsageZoneSchema).safeParse(raw);
  if (array.success) {
    return { data: array.data };
  }

  return { data: [] };
}

export function calculateSdtrUsage(raw: unknown): SdtrUsageSummary {
  const normalized = normalizeSdtrUsagePayload(raw);

  let hasValue = false;
  let used = 0;
  let rest = 0;
  let recharge = 0;
  let hasRecharge = false;
  const rechargeLabels = new Set<string>();

  for (const zone of normalized.data) {
    if (typeof zone.usedValueGo === "number") {
      used += zone.usedValueGo;
      hasValue = true;
    }
    if (typeof zone.restValueGo === "number") {
      rest += zone.restValueGo;
      hasValue = true;
    }

    const rechargeGo = extractRechargeGo(zone);
    if (rechargeGo !== null) {
      recharge += rechargeGo;
      hasRecharge = true;
      rechargeLabels.add(
        normalizeSdtrLabel(
          zone.sRecharge ?? zone.rechargeText ?? zone.rechargeValueText,
        ) ?? formatGoLabel(rechargeGo),
      );
    }
  }

  if (!hasValue) {
    return {
      usedValueGo: null,
      restValueGo: null,
      totalValueGo: null,
      usagePercent: null,
      rechargeValueGo: hasRecharge ? roundSdtrNumber(recharge) : null,
      rechargeLabel: hasRecharge
        ? Array.from(rechargeLabels).join(" + ")
        : null,
    };
  }

  const total = used + rest;
  const usagePercent = total > 0 ? (used / total) * 100 : null;

  return {
    usedValueGo: roundSdtrNumber(used),
    restValueGo: roundSdtrNumber(rest),
    totalValueGo: roundSdtrNumber(total),
    usagePercent:
      usagePercent === null
        ? null
        : roundSdtrNumber(Math.min(100, usagePercent)),
    rechargeValueGo: hasRecharge ? roundSdtrNumber(recharge) : null,
    rechargeLabel: hasRecharge ? Array.from(rechargeLabels).join(" + ") : null,
  };
}
