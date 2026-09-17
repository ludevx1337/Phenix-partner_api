import { JsonPhoenixTool } from "@/components/phenix/json-phoenix-tool";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type PhenixToolConfig = {
  method: "GET" | "POST";
  apiHref: string;
  defaultJson?: string;
  submitLabel?: string;
  cardTitle?: string;
};

type Props = {
  title: string;
  description: string;
  endpoints: string[];
  /** Si défini, formulaire JSON branché sur une route Next `/api/phenix/...`. */
  tool?: PhenixToolConfig;
  /** Plusieurs consoles (ex. deux GET différents sur la même page). */
  tools?: PhenixToolConfig[];
};

export function StubPage({ title, description, endpoints, tool, tools }: Props) {
  const toolList: PhenixToolConfig[] =
    tools && tools.length > 0 ? tools : tool ? [tool] : [];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      </div>
      {toolList.length === 0 ? (
        <Alert>
          <AlertTitle>Intégration à finaliser</AlertTitle>
          <AlertDescription>
            Brancher les routes{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              /api/phenix/...
            </code>{" "}
            sur les endpoints PHENIX listés ci-dessous.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <AlertTitle>Console technique</AlertTitle>
          <AlertDescription>
            Exécute les routes locales{" "}
            <code className="text-xs">/api/phenix/...</code>{" "}
            (authentifiée). Pour préremplir le MSISDN, ouvrez la page avec{" "}
            <code className="text-xs">?msisdn=06...</code> dans l’URL.
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Endpoints PHENIX</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            {endpoints.map((e) => (
              <li key={e}>
                <code className="text-foreground">{e}</code>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      {toolList.map((t, i) => (
        <Card key={`${i}-${t.apiHref}-${t.method}-${t.cardTitle ?? ""}`}>
          <CardHeader>
            <CardTitle className="text-base">
              {t.cardTitle ?? "Exécution"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-muted-foreground font-mono text-xs">{t.apiHref}</p>
            <JsonPhoenixTool
              method={t.method}
              apiHref={t.apiHref}
              defaultJson={t.defaultJson}
              submitLabel={t.submitLabel}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
