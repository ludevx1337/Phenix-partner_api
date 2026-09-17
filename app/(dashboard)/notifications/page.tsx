import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default async function NotificationsPage() {
  await requireUser();
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("notifications")
    .select("*")
    .order("received_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground text-sm">
          Événements reçus via les webhooks{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            /api/notifications/*
          </code>{" "}
          (secret{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            X-Webhook-Token
          </code>
          ).
        </p>
      </div>
      <div className="space-y-3">
        {(rows ?? []).length === 0 ? (
          <Card>
            <CardContent className="text-muted-foreground py-8 text-center text-sm">
              Aucune notification enregistrée.
            </CardContent>
          </Card>
        ) : (
          (rows ?? []).map((n) => (
            <Card key={n.id}>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-base font-medium">
                  <Badge variant="secondary">{n.event_type}</Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  {n.received_at
                    ? format(new Date(n.received_at), "Pp", { locale: fr })
                    : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="bg-muted max-h-48 overflow-auto rounded-md p-3 text-xs">
                  {JSON.stringify(n.payload, null, 2)}
                </pre>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
