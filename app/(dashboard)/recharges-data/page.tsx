import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default async function RechargesDataPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("data_recharges")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Recharges DATA</h1>
          <p className="text-muted-foreground text-sm">
            Historique local + création via{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              POST /api/phenix/data-recharges/add
            </code>
            .
          </p>
        </div>
        <Link
          href="/recharges-data/nouvelle"
          className={cn(buttonVariants({ variant: "default" }))}
        >
          Nouvelle recharge
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historique</CardTitle>
          <CardDescription>
            MSISDN, zone, code, date, statut (enregistré après succès API).
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>MSISDN</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(rows ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    Aucune recharge enregistrée.
                  </TableCell>
                </TableRow>
              ) : (
                (rows ?? []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.msisdn}</TableCell>
                    <TableCell>{r.zone ?? "—"}</TableCell>
                    <TableCell className="text-xs">{r.code_recharge ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      {r.created_at
                        ? format(new Date(r.created_at), "Pp", { locale: fr })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{r.statut ?? "—"}</Badge>
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
