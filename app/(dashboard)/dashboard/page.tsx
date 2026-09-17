import { DataConsoChart, type ConsoPoint } from "@/components/charts/data-conso-chart";
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
import { classifyEtat } from "@/lib/gsm/etat";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: lines } = await supabase
    .from("gsm_lines")
    .select("etat")
    .eq("user_id", user.id);

  const counts = { active: 0, suspend: 0, resilie: 0, other: 0 };
  for (const row of lines ?? []) {
    const c = classifyEtat(row.etat);
    counts[c] += 1;
  }

  const { data: recentLogs } = await supabase
    .from("phenix_api_logs")
    .select("endpoint, method, response_status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(8);

  const { data: recentRecharges } = await supabase
    .from("data_recharges")
    .select("msisdn, zone, code_recharge, created_at, statut")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(8);

  const { data: alerts } = await supabase
    .from("notifications")
    .select("event_type, received_at, payload")
    .order("received_at", { ascending: false })
    .limit(6);

  const { data: rechargeSeries } = await supabase
    .from("data_recharges")
    .select("created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(200);

  const byDay = new Map<string, number>();
  for (const r of rechargeSeries ?? []) {
    const d = r.created_at
      ? format(new Date(r.created_at), "yyyy-MM-dd", { locale: fr })
      : "";
    if (!d) continue;
    byDay.set(d, (byDay.get(d) ?? 0) + 1);
  }
  const chartData: ConsoPoint[] = Array.from(byDay.entries()).map(
    ([date, volume]) => ({ date, volume }),
  );

  const total = lines?.length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Vue d’ensemble des lignes, recharges DATA et activité API.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total lignes</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Actives</CardDescription>
            <CardTitle className="text-3xl tabular-nums text-emerald-600 dark:text-emerald-400">
              {counts.active}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Suspendues</CardDescription>
            <CardTitle className="text-3xl tabular-nums text-amber-600 dark:text-amber-400">
              {counts.suspend}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Résiliées</CardDescription>
            <CardTitle className="text-3xl tabular-nums text-destructive">
              {counts.resilie}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recharges DATA (volume)</CardTitle>
            <CardDescription>
              Nombre de recharges enregistrées par jour (historique local).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataConsoChart data={chartData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dernières requêtes GSM</CardTitle>
            <CardDescription>Logs API PHENIX (votre compte)</CardDescription>
          </CardHeader>
          <CardContent className="max-h-72 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Méth.</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(recentLogs ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      Aucun appel enregistré.
                    </TableCell>
                  </TableRow>
                ) : (
                  (recentLogs ?? []).map((log) => (
                    <TableRow key={`${log.endpoint}-${log.created_at}`}>
                      <TableCell className="max-w-[140px] truncate font-mono text-xs">
                        {log.endpoint}
                      </TableCell>
                      <TableCell>{log.method}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{log.response_status}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                        {log.created_at
                          ? format(new Date(log.created_at), "dd/MM HH:mm", {
                              locale: fr,
                            })
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dernières recharges DATA</CardTitle>
          </CardHeader>
          <CardContent className="max-h-72 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>MSISDN</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(recentRecharges ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-muted-foreground">
                      Aucune recharge.
                    </TableCell>
                  </TableRow>
                ) : (
                  (recentRecharges ?? []).map((r) => (
                    <TableRow key={`${r.msisdn}-${r.created_at}`}>
                      <TableCell className="font-mono text-xs">{r.msisdn}</TableCell>
                      <TableCell>{r.zone ?? "—"}</TableCell>
                      <TableCell className="text-xs">{r.code_recharge ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{r.statut ?? "—"}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Alertes récentes</CardTitle>
            <CardDescription>
              Notifications webhooks PHENIX (flux partagé).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(alerts ?? []).length === 0 ? (
              <p className="text-muted-foreground text-sm">Aucune alerte.</p>
            ) : (
              (alerts ?? []).map((a) => (
                <div
                  key={`${a.event_type}-${String(a.received_at)}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"
                >
                  <Badge variant="secondary">{a.event_type}</Badge>
                  <span className="text-muted-foreground text-xs">
                    {a.received_at
                      ? format(new Date(a.received_at), "Pp", { locale: fr })
                      : ""}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
