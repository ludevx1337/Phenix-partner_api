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
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default async function HistoriquePage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: apiLogs } = await supabase
    .from("phenix_api_logs")
    .select("endpoint, method, response_status, created_at, error_message")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(40);

  const { data: lineHist } = await supabase
    .from("gsm_line_history")
    .select("msisdn, action, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(40);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Historique</h1>
        <p className="text-muted-foreground text-sm">
          Journal des appels API PHENIX et actions sur les lignes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Requêtes API PHENIX</CardTitle>
          <CardDescription>Table phenix_api_logs</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead>Méth.</TableHead>
                <TableHead>Statut HTTP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(apiLogs ?? []).map((l) => (
                <TableRow key={`${l.endpoint}-${l.created_at}`}>
                  <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                    {l.created_at
                      ? format(new Date(l.created_at), "Pp", { locale: fr })
                      : "—"}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate font-mono text-xs">
                    {l.endpoint}
                  </TableCell>
                  <TableCell>{l.method}</TableCell>
                  <TableCell>{l.response_status ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historique lignes</CardTitle>
          <CardDescription>Table gsm_line_history</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>MSISDN</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(lineHist ?? []).map((h) => (
                <TableRow key={`${h.msisdn}-${h.created_at}-${h.action}`}>
                  <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                    {h.created_at
                      ? format(new Date(h.created_at), "Pp", { locale: fr })
                      : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{h.msisdn}</TableCell>
                  <TableCell>{h.action}</TableCell>
                  <TableCell>{h.status ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
