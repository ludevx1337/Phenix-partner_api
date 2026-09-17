import { PhoenixConsoTools } from "@/components/consommations/phoenix-conso-tools";

type PageProps = {
  searchParams: Promise<{ msisdn?: string }>;
};

export default async function Page({ searchParams }: PageProps) {
  const { msisdn: raw } = await searchParams;
  const msisdn = raw?.trim() || null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">CDR</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Consommations issues des CDR pour une ligne (paramètres JSON complétés selon la doc
          PHENIX v2.9).
        </p>
      </div>
      <PhoenixConsoTools
        msisdn={msisdn}
        variant="standalone"
        sections={["cdr-from", "cdr-day", "cdr-details"]}
      />
    </div>
  );
}
