import Link from "next/link";
import { PhoenixConsoTools } from "@/components/consommations/phoenix-conso-tools";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type PageProps = {
  searchParams: Promise<{ msisdn?: string }>;
};

export default async function Page({ searchParams }: PageProps) {
  const { msisdn: raw } = await searchParams;
  const msisdn = raw?.trim() || null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Consommations</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm text-pretty">
          Consultation <strong>SDTR</strong> (temps réel) et <strong>CDR</strong> par ligne GSM.
          Les appels passent par les routes sécurisées{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">/api/phenix/consommations/…</code>.
        </p>
      </div>

      <PhoenixConsoTools msisdn={msisdn} variant="standalone" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Références API PHENIX</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
            <li>
              <code className="text-foreground">POST /GsmApi/V2/SdtrConso</code>
            </li>
            <li>
              <code className="text-foreground">GET /GsmApi/GetConsoMsisdnFromCDR</code>
            </li>
            <li>
              <code className="text-foreground">GET /GsmApi/GetConsoMsisdnByDayFromCDR</code>
            </li>
            <li>
              <code className="text-foreground">GET /GsmApi/GetMsisdnConsoDetailsByCDR</code>
            </li>
          </ul>
          <p className="text-muted-foreground mt-3 text-xs">
            Astuce : depuis{" "}
            <Link href="/lignes" className="underline-offset-2 hover:underline">
              Lignes GSM
            </Link>
            , ouvrez une ligne puis « Consommations » pour arriver ici avec le MSISDN déjà renseigné.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
