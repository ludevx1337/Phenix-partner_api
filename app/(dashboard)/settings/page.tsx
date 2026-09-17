import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getStoredPhenixCredentials,
  savePhenixCredentials,
} from "@/lib/phenix/secure-config";
import { getPhenixToken, invalidatePhenixToken } from "@/lib/phenix/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string; message?: string }>;
}) {
  const user = await requireUser();
  const params = (await searchParams) ?? {};
  const supabaseAdmin = createAdminClient();
  const storedCredentials = await getStoredPhenixCredentials();

  async function savePhenixConfigAction(formData: FormData) {
    "use server";
    await requireUser();
    const username = String(formData.get("phenixUsername") ?? "").trim();
    let password = String(formData.get("phenixPassword") ?? "").trim();
    const partenaireId = String(formData.get("phenixPartenaireId") ?? "").trim();

    if (!username || !partenaireId) {
      redirect(
        "/settings?status=error&message=Veuillez+renseigner+username+et+partenaireId.",
      );
    }

    if (!password) {
      const existing = await getStoredPhenixCredentials();
      if (existing?.password) {
        password = existing.password;
      } else {
        redirect(
          "/settings?status=error&message=Mot+de+passe+obligatoire+%28aucun+mot+de+passe+d%C3%A9j%C3%A0+enregistr%C3%A9%29.",
        );
      }
    }

    try {
      await savePhenixCredentials({ username, password, partenaireId });
    } catch (error) {
      const message =
        error instanceof Error
          ? encodeURIComponent(error.message)
          : "Erreur+de+sauvegarde.";
      redirect(`/settings?status=error&message=${message}`);
    }
    revalidatePath("/settings");
    redirect("/settings?status=ok&message=Configuration+PHENIX+enregistr%C3%A9e.");
  }
  async function testPhenixConnectionAction() {
    "use server";
    await requireUser();
    try {
      invalidatePhenixToken();
      await getPhenixToken();
    } catch (error) {
      const message =
        error instanceof Error
          ? encodeURIComponent(error.message)
          : "Erreur+de+connexion+PHENIX.";
      revalidatePath("/settings");
      redirect(`/settings?status=error&message=${message}`);
    }
    revalidatePath("/settings");
    redirect("/settings?status=ok&message=Connexion+PHENIX+OK.");
  }

  const { data: tokenState } = await supabaseAdmin
    .from("phenix_token_cache")
    .select("generated_at,expires_at,last_error,next_retry_at")
    .eq("id", 1)
    .maybeSingle<{
      generated_at: string | null;
      expires_at: string | null;
      last_error: string | null;
      next_retry_at: string | null;
    }>();
  const nowMs = Date.now();
  const expiresAtMs = tokenState?.expires_at
    ? new Date(tokenState.expires_at).getTime()
    : null;
  const tokenIsValid = Boolean(
    tokenState?.generated_at && expiresAtMs && nowMs < expiresAtMs,
  );
  const generatedAtText = tokenState?.generated_at
    ? new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "short",
        timeStyle: "medium",
      }).format(new Date(tokenState.generated_at))
    : null;
  const nextRetryText = tokenState?.next_retry_at
    ? new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "short",
        timeStyle: "medium",
      }).format(new Date(tokenState.next_retry_at))
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground text-sm">
          Compte Supabase et configuration PHENIX.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Profil</CardTitle>
          <CardDescription>Utilisateur connecté</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">ID :</span>{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">{user.id}</code>
          </p>
          <p>
            <span className="text-muted-foreground">Email :</span>{" "}
            {user.email ?? "—"}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Configuration PHENIX (Supabase chiffré)</CardTitle>
          <CardDescription>
            Ces valeurs sont chiffrées côté serveur avant stockage en base.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {params.message ? (
            <p
              className={
                params.status === "ok" ? "text-emerald-600" : "text-destructive"
              }
            >
              {decodeURIComponent(params.message)}
            </p>
          ) : null}
          <form action={savePhenixConfigAction} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="phenixUsername">PHENIX_USERNAME</Label>
              <Input
                id="phenixUsername"
                name="phenixUsername"
                autoComplete="off"
                defaultValue={storedCredentials?.username ?? ""}
                placeholder="login API PHENIX"
                required
              />
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="phenixPartenaireId">PHENIX_PARTENAIRE_ID</Label>
              <Input
                id="phenixPartenaireId"
                name="phenixPartenaireId"
                autoComplete="off"
                defaultValue={storedCredentials?.partenaireId ?? ""}
                placeholder="ex: SO1853"
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="phenixPassword">PHENIX_PASSWORD</Label>
              <Input
                id="phenixPassword"
                name="phenixPassword"
                type="password"
                autoComplete="new-password"
                placeholder={
                  storedCredentials
                    ? "Laisser vide pour conserver le mot de passe enregistré"
                    : "Saisir le mot de passe API"
                }
              />
              <p className="text-muted-foreground text-xs">
                Le mot de passe déjà enregistré n&apos;est pas affiché. Le bouton
                « Tester la connexion » utilise les identifiants stockés en base
                (chiffrés), sans ressaisir le mot de passe.
              </p>
            </div>
            <div className="md:col-span-2 flex flex-wrap gap-2">
              <Button type="submit">Enregistrer la configuration PHENIX</Button>
              <Button
                type="submit"
                formAction={testPhenixConnectionAction}
                formNoValidate
                variant="outline"
              >
                Tester la connexion PHENIX
              </Button>
            </div>
          </form>
          <p className="text-muted-foreground">
            Source actuellement utilisée :{" "}
            <strong>{storedCredentials ? "Supabase (chiffré)" : "variables serveur"}</strong>
            .
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>État du token PHENIX</CardTitle>
          <CardDescription>
            Vérification par date d&apos;expiration stockée en base.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {tokenIsValid ? (
            <p>
              <strong>Token OK</strong>
              {generatedAtText ? `, généré le ${generatedAtText}` : ""}.
            </p>
          ) : tokenState?.last_error ? (
            <>
              <p className="text-destructive">
                Erreur récupération token : {tokenState.last_error}
              </p>
              {nextRetryText ? (
                <p className="text-muted-foreground">
                  Prochaine tentative automatique après : {nextRetryText}
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-muted-foreground">
              Aucun token valide en cache pour le moment.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
