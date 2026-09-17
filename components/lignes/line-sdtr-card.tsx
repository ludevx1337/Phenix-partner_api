"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  normalizeSdtrConsoPayload,
  type SdtrZoneItem,
} from "@/lib/schemas/sdtr-conso";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Props = {
  msisdn: string;
  /** Dernier snapshot en base (affichage immédiat optionnel, sans attendre le POST). */
  initialSdtr?: unknown;
  initialSdtrUpdatedAt?: string | null;
};

type ApiSuccess = {
  data: { data: SdtrZoneItem[] };
  updatedAt: string | null;
  persisted?: boolean;
  warning?: string;
};

function zoneChartRow(z: SdtrZoneItem) {
  const utilise = z.usedValueGo ?? 0;
  const reste = z.restValueGo ?? Math.max(0, (z.rechargeGo ?? z.initialValue ?? 0) - utilise);
  const label =
    (z.libelleZoneText ?? z.libelleZone ?? z.codeZone ?? "Zone").slice(0, 42);
  return {
    key: z.id ?? label,
    label,
    Utilisé: Number(utilise.toFixed(2)),
    Restant: Number(reste.toFixed(2)),
    subtitle: z.descriptionZone ?? z.libelleZone ?? "",
    optionType: z.optionType,
    isCutOff: z.isCutOff,
    usedText: z.usedValueText ?? z.sUsedValue,
    restText: z.restValueText ?? z.remainingValueText,
  };
}

function SdtrCharts({ zones }: { zones: SdtrZoneItem[] }) {
  const rows = useMemo(() => zones.map(zoneChartRow), [zones]);

  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Aucune zone de consommation dans la réponse SDTR.
      </p>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {rows.map((row) => (
        <div
          key={row.key}
          className="space-y-2 rounded-lg border bg-card p-3 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <p className="truncate text-sm font-medium">{row.label}</p>
              {row.subtitle ? (
                <p className="text-muted-foreground line-clamp-2 text-xs">
                  {row.subtitle}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-1">
              {row.optionType ? (
                <Badge variant="secondary" className="text-xs font-normal">
                  {row.optionType}
                </Badge>
              ) : null}
              {row.isCutOff ? (
                <Badge variant="destructive" className="text-xs">
                  Coupure
                </Badge>
              ) : null}
            </div>
          </div>
          <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
            {row.usedText ? <span>Utilisé : {row.usedText}</span> : null}
            {row.restText ? <span>Reste : {row.restText}</span> : null}
          </div>
          <div className="h-44 w-full min-w-0 pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={[
                  {
                    name: "Go",
                    Utilisé: row.Utilisé,
                    Restant: row.Restant,
                  },
                ]}
                margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={28} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value) =>
                    typeof value === "number" ? [`${value} Go`, ""] : [String(value ?? ""), ""]
                  }
                  labelFormatter={() => row.label}
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="Utilisé"
                  stackId="go"
                  fill="var(--color-chart-4)"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="Restant"
                  stackId="go"
                  fill="var(--color-chart-2)"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ))}
    </div>
  );
}

function SdtrSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {[0, 1].map((i) => (
        <div key={i} className="space-y-3 rounded-lg border p-3">
          <Skeleton className="h-4 w-2/3 max-w-[240px]" />
          <Skeleton className="h-3 w-full max-w-md" />
          <Skeleton className="h-36 w-full" />
        </div>
      ))}
    </div>
  );
}

export function LineSdtrCard({
  msisdn,
  initialSdtr,
  initialSdtrUpdatedAt,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zones, setZones] = useState<SdtrZoneItem[]>(() => {
    const n = normalizeSdtrConsoPayload(initialSdtr);
    return n.data;
  });
  const [updatedAt, setUpdatedAt] = useState<string | null>(
    initialSdtrUpdatedAt ?? null,
  );
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function sync() {
      setLoading(true);
      setError(null);
      setWarning(null);
      try {
        const res = await fetch(
          `/api/lignes/${encodeURIComponent(msisdn)}/sdtr`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
            cache: "no-store",
          },
        );
        const json: unknown = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg =
            typeof json === "object" &&
            json !== null &&
            "error" in json &&
            typeof (json as { error?: unknown }).error === "string"
              ? (json as { error: string }).error
              : `Erreur ${res.status}`;
          throw new Error(msg);
        }
        const ok = json as ApiSuccess;
        const next = normalizeSdtrConsoPayload(ok.data);
        if (!cancelled) {
          setZones(next.data);
          setUpdatedAt(ok.updatedAt ?? null);
          if (ok.warning) setWarning(ok.warning);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Erreur SDTR");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void sync();
    return () => {
      cancelled = true;
    };
  }, [msisdn]);

  const updatedLabel =
    updatedAt != null
      ? format(new Date(updatedAt), "Pp", { locale: fr })
      : null;

  return (
    <Card className="overflow-hidden shadow-sm">
      <CardHeader className="border-b bg-muted/30">
        <CardTitle className="text-lg">SDTR — consommation</CardTitle>
        <CardDescription>
          Données temps réel{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            POST /GsmApi/V2/SdtrConso
          </code>
          , chargées à l’ouverture de la fiche et enregistrées sur la ligne.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-6">
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>SDTR indisponible</AlertTitle>
            <AlertDescription className="text-pretty">{error}</AlertDescription>
          </Alert>
        ) : null}
        {warning ? (
          <Alert>
            <AlertTitle>Avertissement</AlertTitle>
            <AlertDescription>{warning}</AlertDescription>
          </Alert>
        ) : null}
        {updatedLabel ? (
          <p className="text-muted-foreground text-xs">
            Dernière mise à jour snapshot :{" "}
            <span className="text-foreground font-medium">{updatedLabel}</span>
          </p>
        ) : null}
        <div className="relative min-h-[120px]">
          {loading && zones.length === 0 ? (
            <SdtrSkeleton />
          ) : (
            <div className="relative">
              {loading ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/55 backdrop-blur-[1px]">
                  <span className="text-muted-foreground rounded-md border bg-card px-2 py-1 text-xs shadow-sm">
                    Mise à jour SDTR…
                  </span>
                </div>
              ) : null}
              <SdtrCharts zones={zones} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
