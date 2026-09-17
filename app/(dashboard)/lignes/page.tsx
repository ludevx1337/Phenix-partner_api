import { LinesSyncButton } from "@/components/forms/lines-sync-button";
import { LinesTable } from "@/components/tables/lines-table";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";
import type { GsmLine, GsmLineSdtrSnapshot } from "@/types/database";

export default async function LignesPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("gsm_lines")
    .select("*")
    .eq("user_id", user.id)
    .order("msisdn", { ascending: true });

  const { data: sdtrRows } = await supabase
    .from("gsm_line_latest_sdtr")
    .select("*")
    .eq("user_id", user.id);

  const sdtrByLineId = new Map(
    ((sdtrRows ?? []) as GsmLineSdtrSnapshot[]).map((row) => [
      row.line_id,
      row,
    ]),
  );
  const lines = ((rows ?? []) as GsmLine[]).map((line) => ({
    ...line,
    latest_sdtr: sdtrByLineId.get(line.id) ?? null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Lignes GSM</h1>
          <p className="text-muted-foreground text-sm">
            Données synchronisées via{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              GET /api/phenix/lines/consult-all
            </code>
            .
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LinesSyncButton />
          <Link
            href="/lignes/activation"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Activation
          </Link>
          <Link
            href="/lignes/requete-gsm"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Requête GSM
          </Link>
          <Link
            href="/consommations"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Consommations
          </Link>
        </div>
      </div>
      <LinesTable lines={lines} />
    </div>
  );
}
