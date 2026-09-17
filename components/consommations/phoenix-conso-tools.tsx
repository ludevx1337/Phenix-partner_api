"use client";

import { Suspense } from "react";
import Link from "next/link";
import { LineChart, Radio } from "lucide-react";
import { JsonPhoenixTool } from "@/components/phenix/json-phoenix-tool";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export type ConsoSectionId = "sdtr" | "cdr-from" | "cdr-day" | "cdr-details";

const SECTION_META: Record<
  ConsoSectionId,
  { title: string; description: string }
> = {
  sdtr: {
    title: "SDTR — temps réel",
    description: "POST SdtrConso — charge utile JSON selon doc PHENIX.",
  },
  "cdr-from": {
    title: "CDR — conso MSISDN",
    description: "Synthèse depuis les CDR.",
  },
  "cdr-day": {
    title: "CDR — par jour",
    description: "Conso agrégée par jour.",
  },
  "cdr-details": {
    title: "CDR — détails",
    description: "Détail des enregistrements CDR.",
  },
};

const SECTION_TOOLS: Record<
  ConsoSectionId,
  {
    method: "GET" | "POST";
    apiHref: string;
    defaultJson: string;
    submitLabel: string;
  }
> = {
  sdtr: {
    method: "POST",
    apiHref: "/api/phenix/consommations/sdtr",
    defaultJson: '{"msisdn":"__MSISDN__"}',
    submitLabel: "Interroger SDTR",
  },
  "cdr-from": {
    method: "GET",
    apiHref: "/api/phenix/consommations/cdr/from-msisdn",
    defaultJson: '{"msisdn":"__MSISDN__"}',
    submitLabel: "Charger",
  },
  "cdr-day": {
    method: "GET",
    apiHref: "/api/phenix/consommations/cdr/by-day",
    defaultJson: '{"msisdn":"__MSISDN__"}',
    submitLabel: "Charger",
  },
  "cdr-details": {
    method: "GET",
    apiHref: "/api/phenix/consommations/cdr/details",
    defaultJson: '{"msisdn":"__MSISDN__"}',
    submitLabel: "Charger",
  },
};

type Props = {
  /** MSISDN connu (fiche ligne) ou passé en `?msisdn=` côté page consommations. */
  msisdn?: string | null;
  /** Sections affichées (ordre conservé). Défaut : tout. */
  sections?: ConsoSectionId[];
  /**
   * `standalone` : encart d’aide (URL / lien lignes).
   * `embedded` : fiche ligne — pas de bandeau redondant.
   */
  variant?: "standalone" | "embedded";
};

function ToolCard({
  id,
  msisdn,
}: {
  id: ConsoSectionId;
  msisdn?: string | null;
}) {
  const meta = SECTION_META[id];
  const tool = SECTION_TOOLS[id];
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{meta.title}</CardTitle>
        <CardDescription>{meta.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <JsonPhoenixTool
          method={tool.method}
          apiHref={tool.apiHref}
          defaultJson={tool.defaultJson}
          submitLabel={tool.submitLabel}
          msisdn={msisdn}
        />
      </CardContent>
    </Card>
  );
}

function PhoenixConsoToolsInner({
  msisdn,
  sections = ["sdtr", "cdr-from", "cdr-day", "cdr-details"],
  variant = "standalone",
}: Props) {
  const lineMsisdn = msisdn?.trim() ?? "";
  const hasMsisdn = lineMsisdn.length > 0;
  const cdrIds = sections.filter((s) => s !== "sdtr");
  const hasSdtr = sections.includes("sdtr");
  const hasCdr = cdrIds.length > 0;

  return (
    <div className="space-y-4">
      {variant === "standalone" ? (
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-sm",
            hasMsisdn
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-amber-500/25 bg-amber-500/5",
          )}
        >
          {hasMsisdn ? (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Radio className="text-emerald-600 size-4 shrink-0" aria-hidden />
              <span>
                MSISDN cible :{" "}
                <span className="font-mono font-medium">{lineMsisdn}</span>
              </span>
              <Link
                href={`/lignes/${encodeURIComponent(lineMsisdn)}`}
                className="text-muted-foreground underline-offset-2 hover:underline"
              >
                Ouvrir la fiche ligne
              </Link>
            </p>
          ) : (
            <p className="text-pretty">
              <LineChart className="mr-1 inline size-4 align-text-bottom opacity-70" aria-hidden />
              Ajoutez <code className="rounded bg-muted px-1 py-0.5 text-xs">?msisdn=…</code> dans
              l’URL ou ouvrez cette page depuis une{" "}
              <Link href="/lignes" className="font-medium underline-offset-2 hover:underline">
                ligne GSM
              </Link>{" "}
              (lien « Consommations ») pour préremplir le MSISDN dans les requêtes ci-dessous.
            </p>
          )}
        </div>
      ) : null}

      {hasSdtr && hasCdr ? (
        <Tabs defaultValue="cdr" className="gap-4">
          <TabsList
            variant="line"
            className="h-auto w-full flex-wrap justify-start gap-1 border-b border-border bg-transparent p-0"
          >
            <TabsTrigger value="cdr" className="px-3 py-2">
              CDR
            </TabsTrigger>
            <TabsTrigger value="sdtr" className="px-3 py-2">
              SDTR
            </TabsTrigger>
          </TabsList>
          <TabsContent value="cdr" className="mt-0 space-y-4">
            {cdrIds.map((id) => (
              <ToolCard key={id} id={id} msisdn={lineMsisdn || null} />
            ))}
          </TabsContent>
          <TabsContent value="sdtr" className="mt-0">
            <ToolCard id="sdtr" msisdn={lineMsisdn || null} />
          </TabsContent>
        </Tabs>
      ) : hasCdr ? (
        <div className="space-y-4">
          {cdrIds.map((id) => (
            <ToolCard key={id} id={id} msisdn={lineMsisdn || null} />
          ))}
        </div>
      ) : hasSdtr ? (
        <ToolCard id="sdtr" msisdn={lineMsisdn || null} />
      ) : null}
    </div>
  );
}

/** Outils PHENIX consommations — enveloppe Suspense pour `useSearchParams` dans les outils. */
export function PhoenixConsoTools(props: Props) {
  return (
    <Suspense
      fallback={
        <p className="text-muted-foreground text-sm">Chargement des outils…</p>
      }
    >
      <PhoenixConsoToolsInner {...props} />
    </Suspense>
  );
}
