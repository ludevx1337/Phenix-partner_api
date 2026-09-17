import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { PhoenixConsoTools } from "@/components/consommations/phoenix-conso-tools";
import { LineSdtrCard } from "@/components/lignes/line-sdtr-card";
import { PhenixLineConsultPanel } from "@/components/lignes/phenix-line-consult-panel";
import { PhenixApiError, phenixFetch } from "@/lib/phenix/client";
import { PhenixEndpoints } from "@/lib/phenix/endpoints";
import { msisdnParamSchema } from "@/lib/phenix/schemas";
import { resolvePartenaireId } from "@/lib/phenix/secure-config";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { z } from "zod";

type PageProps = { params: Promise<{ msisdn: string }> };

export default async function LigneDetailPage({ params }: PageProps) {
  const user = await requireUser();
  const { msisdn: raw } = await params;
  const msisdn = decodeURIComponent(raw);
  msisdnParamSchema.parse({ msisdn });

  const supabase = await createClient();
  const { data: line } = await supabase
    .from("gsm_lines")
    .select("*")
    .eq("user_id", user.id)
    .eq("msisdn", msisdn)
    .maybeSingle();

  if (!line) {
    notFound();
  }

  const { data: history } = await supabase
    .from("gsm_line_history")
    .select("*")
    .eq("user_id", user.id)
    .eq("msisdn", msisdn)
    .order("created_at", { ascending: false })
    .limit(40);

  let consult: unknown = null;
  let consultError: string | null = null;
  try {
    const partenaireId = await resolvePartenaireId();
    consult = await phenixFetch({
      path: PhenixEndpoints.msisdnConsult,
      method: "GET",
      query: {
        msisdn,
        partenaireId,
      },
      schema: z.unknown(),
      userId: user.id,
    });
  } catch (e) {
    consultError =
      e instanceof PhenixApiError
        ? e.message
        : e instanceof Error
          ? e.message
          : "Erreur consultation PHENIX";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/lignes"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          ← Lignes
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight font-mono">
          {msisdn}
        </h1>
        <Badge variant="outline">{line.operateur ?? "—"}</Badge>
        <Badge>{line.etat ?? "—"}</Badge>
      </div>

      <Card className="overflow-hidden shadow-sm">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="text-lg">Données PHENIX en direct</CardTitle>
          <CardDescription>
            Fiche issue de <span className="font-mono text-xs">MsisdnConsult</span> — onglets
            pour parcourir rapidement les informations.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {consultError ? (
            <Alert variant="destructive">
              <AlertTitle>Consultation PHENIX impossible</AlertTitle>
              <AlertDescription className="text-pretty">{consultError}</AlertDescription>
            </Alert>
          ) : (
            <PhenixLineConsultPanel data={consult} />
          )}
        </CardContent>
      </Card>

      <LineSdtrCard
        msisdn={msisdn}
        initialSdtr={line.sdtr_conso ?? undefined}
        initialSdtrUpdatedAt={line.sdtr_conso_updated_at ?? null}
      />

      <Card className="overflow-hidden shadow-sm">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="text-lg">CDR</CardTitle>
          <CardDescription>
            Extractions CDR pour ce MSISDN (mêmes routes que la page{" "}
            <Link
              href={`/consommations?msisdn=${encodeURIComponent(msisdn)}`}
              className="font-medium underline-offset-2 hover:underline"
            >
              Consommations
            </Link>
            ). Le SDTR temps réel est dans la carte ci-dessus.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <PhoenixConsoTools
            msisdn={msisdn}
            variant="embedded"
            sections={["cdr-from", "cdr-day", "cdr-details"]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
          <CardDescription>
            Ouvre la console technique avec ce MSISDN prérempli (
            <code className="text-xs">?msisdn=</code>).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {(
            [
              ["Suspension", `/lignes/suspension?msisdn=${encodeURIComponent(msisdn)}`],
              ["Réactivation", `/lignes/reactivation?msisdn=${encodeURIComponent(msisdn)}`],
              ["Résiliation", `/lignes/resiliation?msisdn=${encodeURIComponent(msisdn)}`],
              ["RIO", `/lignes/rio?msisdn=${encodeURIComponent(msisdn)}`],
              ["SIM swap", `/lignes/sim-swap?msisdn=${encodeURIComponent(msisdn)}`],
              ["Options", `/lignes/modification-options?msisdn=${encodeURIComponent(msisdn)}`],
              ["Requête GSM", `/lignes/requete-gsm?msisdn=${encodeURIComponent(msisdn)}`],
              [
                "Consommations",
                `/consommations?msisdn=${encodeURIComponent(msisdn)}`,
              ],
            ] as const
          ).map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              {label}
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historique actions</CardTitle>
          <CardDescription>
            Suspend / réactivation / autres (table{" "}
            <code className="text-xs">gsm_line_history</code>)
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(history ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">
                    Aucun historique.
                  </TableCell>
                </TableRow>
              ) : (
                (history ?? []).map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>{h.action}</TableCell>
                    <TableCell>{h.status ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      {h.created_at
                        ? format(new Date(h.created_at), "Pp", { locale: fr })
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
