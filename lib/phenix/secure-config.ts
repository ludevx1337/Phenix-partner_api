import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { decryptSecret, encryptSecret } from "@/lib/security/encryption";

type SecureConfigRow = {
  username_enc: string;
  password_enc: string;
  partenaire_id_enc: string;
  configured_at: string;
};

export type PhenixCredentials = {
  username: string;
  password: string;
  partenaireId: string;
  source: "supabase" | "env";
};

export async function getStoredPhenixCredentials(): Promise<PhenixCredentials | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("phenix_secure_config")
    .select("username_enc,password_enc,partenaire_id_enc,configured_at")
    .eq("id", 1)
    .maybeSingle<SecureConfigRow>();

  if (error || !data) return null;

  try {
    return {
      username: decryptSecret(data.username_enc),
      password: decryptSecret(data.password_enc),
      partenaireId: decryptSecret(data.partenaire_id_enc),
      source: "supabase",
    };
  } catch (e) {
    console.error("[phenix] decrypt stored credentials failed", e);
    return null;
  }
}

export async function savePhenixCredentials(input: {
  username: string;
  password: string;
  partenaireId: string;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("phenix_secure_config").upsert(
    {
      id: 1,
      username_enc: encryptSecret(input.username),
      password_enc: encryptSecret(input.password),
      partenaire_id_enc: encryptSecret(input.partenaireId),
      configured_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) {
    throw new Error(`Sauvegarde config PHENIX impossible: ${error.message}`);
  }
}

export async function getPhenixCredentials(): Promise<PhenixCredentials> {
  const stored = await getStoredPhenixCredentials();
  if (stored) return stored;

  const username = process.env.PHENIX_USERNAME;
  const password = process.env.PHENIX_PASSWORD;
  const partenaireId = process.env.PHENIX_PARTENAIRE_ID;

  if (!username || !password || !partenaireId) {
    throw new Error(
      "Configuration PHENIX manquante. Renseignez les paramètres PHENIX (UI) ou PHENIX_USERNAME/PHENIX_PASSWORD/PHENIX_PARTENAIRE_ID.",
    );
  }

  return { username, password, partenaireId, source: "env" };
}

/** `partenaireId` effectif pour les appels API (override corps / query sinon config chiffrée ou .env). */
export async function resolvePartenaireId(
  override?: string | null,
): Promise<string> {
  const trimmed = override?.trim();
  if (trimmed) return trimmed;
  const { partenaireId } = await getPhenixCredentials();
  const p = String(partenaireId ?? "").trim();
  if (!p) {
    throw new Error(
      "partenaireId manquant : configurez PHENIX dans Paramètres ou les variables d’environnement.",
    );
  }
  return p;
}
