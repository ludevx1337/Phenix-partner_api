"use client";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertCircle, CalendarClock, Cpu, LayoutDashboard, ListTree } from "lucide-react";

type Props = {
  data: unknown;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return null;
}

function str(v: unknown): string | undefined {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number" && !Number.isNaN(v)) return String(v);
  return undefined;
}

function formatDateFr(iso: string | undefined): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return format(d, "d MMMM yyyy à HH:mm", { locale: fr });
}

function formatDateShort(iso: string | undefined): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return format(d, "dd/MM/yyyy", { locale: fr });
}

function humanizeCode(code: string): string {
  const known: Record<string, string> = {
    DATA: "Données",
    messagerieVocalePro: "Messagerie vocale pro",
    roamingData: "Roaming données",
    roamingVoix: "Roaming voix",
    roamingSmsMms: "Roaming SMS / MMS",
    transfertAppel: "Transfert d’appel",
    MissedCallVMS: "Appels manqués (VMS)",
    cutOffDataRoamingEu: "Cut-off data roaming UE",
    cutOffDataRoamingHorsEu: "Cut-off data roaming hors UE",
    rappelParMV: "Rappel par messagerie",
    renvoiAutoMV: "Renvoi automatique (MV)",
    mmsNational: "MMS national",
    autoriseAchatActe: "Achat à l’acte",
    appelsMetropoleVersInternat: "Appels métropole → international",
    conversationA3: "Conversation à 3",
    doubleAppel: "Double appel",
    CLIP: "Présentation du numéro (CLIP)",
    ims: "IMS (VoLTE / VoWiFi)",
    voixNational: "Voix nationale",
    smsNational: "SMS national",
    visiophonie: "Visiophonie",
    apnWeb: "APN Web",
    accessLTE: "Accès LTE",
    profilData: "Profil data",
    IsDataBloque: "Données bloquées",
    seuil: "Seuil",
    allowed: "Périmètre",
    motPasse: "Code messagerie",
    cfBusy: "Occupé",
    cfUnavail: "Indisponible",
    cfNoAnswer: "Sans réponse",
    timerNoAnsw: "Délai sans réponse (s)",
    profilDataID: "Profil data",
    debitMaxKB: "Débit max descendant",
    debitMaxUplinkKB: "Débit max montant",
  };
  if (known[code]) return known[code];
  if (code === code.toUpperCase() && code.length <= 8) return code;
  return code
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function isSensitiveParam(code: string): boolean {
  return /pass|password|secret|token|pin|puk|pwd|credential/i.test(code);
}

function maskValue(raw: string): string {
  if (raw.length <= 2) return "••";
  return `${raw.slice(0, 1)}${"•".repeat(Math.min(raw.length - 2, 8))}${raw.slice(-1)}`;
}

function formatParamValue(codeParam: string, value: string): string {
  if (isSensitiveParam(codeParam)) return maskValue(value);
  if (codeParam === "debitMaxKB" || codeParam === "debitMaxUplinkKB") {
    const n = Number(value);
    if (!Number.isNaN(n) && n >= 1_000_000_000) return "Non bridé (élevé)";
  }
  if (value === "true") return "Oui";
  if (value === "false") return "Non";
  if (value === "ALL") return "Tout";
  return value;
}

type ProduitParam = {
  codeParam?: unknown;
  selectedValue?: unknown;
};

type Produit = {
  code?: unknown;
  produitParams?: unknown;
};

function parseProduits(raw: unknown): Produit[] {
  if (!Array.isArray(raw)) return [];
  return raw as Produit[];
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | undefined;
  mono?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5 py-2 first:pt-0 last:pb-0">
      <div className="text-muted-foreground text-xs font-medium">{label}</div>
      <div
        className={cn(
          "text-sm leading-snug text-foreground",
          mono && "font-mono text-xs tracking-tight",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function EtatBadge({
  etat,
  libelle,
}: {
  etat: string | undefined;
  libelle: string | undefined;
}) {
  const label = libelle ?? etat;
  if (!label) return null;
  const low = label.toLowerCase();
  const variant:
    | "default"
    | "secondary"
    | "destructive"
    | "outline" =
    low.includes("act") && !low.includes("susp")
      ? "default"
      : low.includes("susp")
        ? "secondary"
        : low.includes("résil") || low.includes("resil") || low.includes("delet")
          ? "destructive"
          : "outline";
  return <Badge variant={variant}>{label}</Badge>;
}

function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | undefined;
  sub?: string;
}) {
  if (!value && !sub) return null;
  return (
    <div className="rounded-lg border bg-card/80 px-3 py-2.5 shadow-sm">
      <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-sm font-semibold tracking-tight">{value ?? "—"}</p>
      {sub ? <p className="text-muted-foreground mt-0.5 text-xs">{sub}</p> : null}
    </div>
  );
}

export function PhenixLineConsultPanel({ data }: Props) {
  const root = Array.isArray(data) ? asRecord(data[0]) : asRecord(data);
  if (!root) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertTitle>Données indisponibles</AlertTitle>
        <AlertDescription>
          PHENIX n’a pas renvoyé de fiche exploitable pour cette ligne.
        </AlertDescription>
      </Alert>
    );
  }

  const msisdn = str(root.msisdn ?? root.Msisdn);
  const simsn = str(root.simsn ?? root.simSn);
  const imsi = str(root.imsi ?? root.Imsi);
  const codeClient = str(root.codeClient ?? root.code_client);
  const nomClient = str(root.nomClient ?? root.nom_client);
  const siteLibelle = str(root.siteLibelle);
  const etat = str(root.etat);
  const etatLibelle = str(root.etatLibelle);
  const operateur = str(root.operateur);
  const rio = str(root.rio);
  const typeSim = str(root.typeSim);
  const forfaitCode = str(root.forfaitGsmCode);
  const codeTarif = str(root.codeTarifAchat);
  const apn = str(root.apn);
  const codeApn = str(root.codeApn);
  const isDataOnly = root.isDataOnly === true || root.isDataOnly === "true";
  const hasIpFixe = root.hasIpFixe === true || root.hasIpFixe === "true";
  const ipFixe = str(root.ipFixe);
  const radiusLogin = str(root.radiusLogin);
  const dateActivation = formatDateFr(str(root.dateActivation));
  const dateActivationShort = formatDateShort(str(root.dateActivation));
  const dateResiliation = formatDateFr(str(root.dateResiliation));
  const engagement = str(root.durreeEngagement ?? root.dureeEngagement);
  const finEngagement = formatDateFr(str(root.dateFinEngagement));
  const produits = parseProduits(root.produits);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-gradient-to-b from-muted/50 to-card px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
              Fiche opérateur
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight">
                {nomClient ?? "Ligne GSM"}
              </h2>
              {codeClient ? (
                <Badge variant="outline" className="font-mono text-xs">
                  {codeClient}
                </Badge>
              ) : null}
            </div>
            {siteLibelle ? (
              <p className="text-muted-foreground text-sm">{siteLibelle}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {msisdn ? (
              <span className="font-mono text-lg font-semibold tracking-tight">{msisdn}</span>
            ) : null}
            {operateur ? <Badge variant="secondary">{operateur}</Badge> : null}
            <EtatBadge etat={etat} libelle={etatLibelle} />
          </div>
        </div>
      </div>

      <Tabs defaultValue="apercu" className="gap-4">
        <TabsList
          variant="line"
          className="h-auto w-full flex-wrap justify-start gap-1 border-b border-border bg-transparent p-0 pb-0"
        >
          <TabsTrigger value="apercu" className="gap-1.5 px-3 py-2">
            <LayoutDashboard className="size-3.5 opacity-70" />
            Aperçu
          </TabsTrigger>
          <TabsTrigger value="carte" className="gap-1.5 px-3 py-2">
            <Cpu className="size-3.5 opacity-70" />
            Carte & réseau
          </TabsTrigger>
          <TabsTrigger value="offre" className="gap-1.5 px-3 py-2">
            <CalendarClock className="size-3.5 opacity-70" />
            Offre & cycle de vie
          </TabsTrigger>
          <TabsTrigger value="options" className="gap-1.5 px-3 py-2">
            <ListTree className="size-3.5 opacity-70" />
            Options
            {produits.length > 0 ? (
              <Badge variant="secondary" className="ml-0.5 h-5 min-w-5 px-1 text-[10px]">
                {produits.length}
              </Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="apercu" className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Opérateur" value={operateur} />
            <StatTile label="État" value={etatLibelle ?? etat} />
            <StatTile label="Type carte" value={typeSim} />
            <StatTile
              label="Forfait"
              value={forfaitCode}
              sub={codeTarif ? `Tarif : ${codeTarif}` : undefined}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <StatTile label="Activation" value={dateActivationShort ?? dateActivation} />
            <StatTile label="APN" value={apn ?? codeApn} />
          </div>
          {isDataOnly ? (
            <p className="text-muted-foreground text-sm">Ligne configurée en <strong>data only</strong>.</p>
          ) : null}
        </TabsContent>

        <TabsContent value="carte" className="mt-4 space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <h3 className="text-sm font-semibold">Identifiants matériel</h3>
            <Separator className="my-3" />
            <div className="divide-y">
              <Row label="Type de carte" value={typeSim} />
              <Row label="SIM SN (ICCID / série)" value={simsn} mono />
              <Row label="IMSI" value={imsi} mono />
              <Row label="Code RIO" value={rio} mono />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="offre" className="mt-4 space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <h3 className="text-sm font-semibold">Offre & connectivité</h3>
            <Separator className="my-3" />
            <div className="divide-y">
              <Row label="Code forfait" value={forfaitCode} mono />
              <Row label="Code tarif achat" value={codeTarif} mono />
              <Row label="APN" value={apn ?? codeApn} mono />
            </div>
            {hasIpFixe ? (
              <>
                <Separator className="my-4" />
                <h4 className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wide">
                  IP fixe
                </h4>
                <div className="divide-y">
                  <Row label="Adresse IP" value={ipFixe} mono />
                  <Row label="Login RADIUS" value={radiusLogin} mono />
                </div>
              </>
            ) : null}
          </div>
          <div className="rounded-lg border bg-card p-4">
            <h3 className="text-sm font-semibold">Cycle de vie</h3>
            <Separator className="my-3" />
            <div className="divide-y">
              <Row label="Activation" value={dateActivation} />
              <Row label="Résiliation" value={dateResiliation} />
              {engagement ? <Row label="Durée d’engagement (mois)" value={engagement} /> : null}
              {finEngagement ? <Row label="Fin d’engagement" value={finEngagement} /> : null}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="options" className="mt-4">
          {produits.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucune option renvoyée pour cette ligne.</p>
          ) : (
            <ScrollArea className="h-[min(28rem,calc(100vh-20rem))] pr-3">
              <ul className="space-y-2">
                {produits.map((p, idx) => {
                  const code = str(p.code) ?? `option-${idx}`;
                  const params = Array.isArray(p.produitParams)
                    ? (p.produitParams as ProduitParam[])
                    : [];
                  const meaningful = params.filter((x) => {
                    const cp = str(x.codeParam);
                    const sv = str(x.selectedValue);
                    return cp && sv !== undefined && sv !== "";
                  });

                  return (
                    <li
                      key={`${code}-${idx}`}
                      className="rounded-lg border border-border/80 bg-card/50 p-3 transition-colors hover:bg-muted/30"
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">{humanizeCode(code)}</p>
                          {meaningful.length === 0 ? (
                            <Badge variant="outline" className="text-[10px]">
                              Actif
                            </Badge>
                          ) : null}
                        </div>
                        {meaningful.length > 0 ? (
                          <div className="space-y-2 border-t border-border/60 pt-2">
                            {meaningful.map((param, j) => {
                              const cp = str(param.codeParam) ?? "";
                              const sv = str(param.selectedValue) ?? "";
                              return (
                                <div
                                  key={`${cp}-${j}`}
                                  className="flex flex-col gap-0.5 rounded-md bg-muted/40 px-2 py-1.5 text-sm"
                                >
                                  <span className="text-muted-foreground text-xs">
                                    {humanizeCode(cp)}
                                  </span>
                                  <span className="font-mono text-xs break-all text-foreground">
                                    {formatParamValue(cp, sv)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
