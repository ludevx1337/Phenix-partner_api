# PHENIX GSM

Interface web interne de gestion GSM connectée à l’API **PHENIX GSM v2.9**.

Le projet est une application **Next.js 15 / React 19 / TypeScript** avec :

- authentification Supabase ;
- stockage métier PostgreSQL via Supabase ;
- appels à l’API PHENIX uniquement côté serveur ;
- routes API Next.js servant de passerelle entre l’interface et PHENIX ;
- webhooks PHENIX ;
- historique des opérations et logs d’appels API ;
- maintenance automatique des consommations SDTR via Supabase Edge Function + Cron ;
- alertes email Resend et notifications Pushover.

## 1. Architecture générale

```text
Navigateur
   |
   | session Supabase
   v
Next.js
   |
   +--> Supabase Auth / PostgreSQL
   |
   +--> Routes /api/phenix/*
              |
              v
        API PHENIX GSM v2.9

Supabase Cron
   |
   v
Edge Function phenix-maintenance
   |
   +--> API PHENIX
   +--> PostgreSQL
   +--> Resend
   +--> Pushover
```

Les identifiants PHENIX et la `SUPABASE_SERVICE_ROLE_KEY` restent côté serveur. Ils ne doivent jamais être exposés à un composant React client.

## 2. Ce que fait l’application

### Authentification

Supabase Auth gère les sessions utilisateurs. Le middleware protège les pages du dashboard et redirige vers `/login` lorsqu’aucune session n’est valide.

Chaque utilisateur possède une ligne associée dans `public.profiles`.

### Gestion des lignes GSM

L’application interroge PHENIX pour récupérer et synchroniser les lignes GSM :

- MSISDN ;
- ICCID ;
- opérateur ;
- état ;
- client ;
- forfait ;
- tarif d’achat ;
- IP fixe ;
- options ;
- données brutes PHENIX.

Les routes disponibles couvrent notamment :

- consultation et synchronisation des lignes ;
- suspension / réactivation ;
- activation ;
- résiliation ;
- SIM swap ;
- modification d’options ;
- RIO ;
- commandes GSM ;
- opérations APN / opérateur / cutoff ;
- portabilités entrantes et sortantes ;
- commandes SIM / eSIM ;
- QR code et code d’activation eSIM ;
- catalogue produits / profils / clients.

Certaines pages de l’interface utilisent encore `StubPage` : les routes serveur PHENIX correspondantes peuvent déjà exister alors que l’écran métier complet reste à finaliser.

### Recharges DATA et consommation SDTR

Les consommations SDTR sont stockées dans :

- `gsm_lines.sdtr_conso` pour le dernier état connu ;
- `gsm_line_sdtr_snapshots` pour l’historique périodique.

Le système calcule notamment :

- volume utilisé ;
- volume restant ;
- volume total ;
- pourcentage d’utilisation ;
- recharge DATA détectée ;
- libellé de recharge.

La vue `gsm_line_latest_sdtr` expose le dernier snapshot par ligne.

### Historique et logs

Les opérations et appels PHENIX sont conservés dans Supabase :

- `phenix_api_logs` ;
- `gsm_line_history` ;
- `data_recharge_history` ;
- `notifications` ;
- autres tables métier.

Les données sensibles connues sont masquées avant journalisation.

### Webhooks

Les notifications PHENIX arrivent dans `app/api/notifications/*`.

Exemples :

- `commande-gsm-state` ;
- `ligne-gsm-state` ;
- `porta-in` ;
- `porta-out` ;
- `gsm-alert` ;
- `msisdn-event` ;
- `msisdn-data-conso` ;
- `border-cross`.

Chaque appel doit envoyer :

```text
X-Webhook-Token: <PHENIX_WEBHOOK_SECRET>
```

## 3. Supabase

Supabase fournit trois briques principales au projet.

### Auth

Les sessions utilisateurs sont gérées avec `@supabase/ssr`.

Fichiers principaux :

```text
lib/supabase/client.ts
lib/supabase/server.ts
lib/supabase/middleware.ts
middleware.ts
```

### PostgreSQL

Le schéma complet est maintenant consolidé dans un seul fichier :

```text
supabase/migrations/0001_init.sql
```

Ce fichier contient l’équivalent des anciennes migrations `0001` à `0008`, dans leur ordre d’exécution historique.

Il crée notamment :

```text
profiles
phenix_api_logs
gsm_lines
gsm_line_history
data_recharges
data_recharge_history
sim_orders
esim_orders
sim_stock
gsm_requests
portabilities
esim_qrcodes
notifications
customers
gsm_products
gsm_profiles
phenix_token_cache
phenix_secure_config
gsm_line_sdtr_snapshots
```

Il crée aussi :

- les index ;
- les triggers `updated_at` ;
- les politiques RLS ;
- la vue `gsm_line_latest_sdtr` ;
- les extensions nécessaires ;
- les jobs `pg_cron` de maintenance.

> Important : ce fichier consolidé est prévu en priorité pour une **installation Supabase neuve**. Ne pas le rejouer tel quel sur une base déjà initialisée sans vérifier l’état du schéma.

### Edge Function

La fonction :

```text
supabase/functions/phenix-maintenance/index.ts
```

accepte quatre actions :

```text
sync-lines
refresh-sdtr
purge-sdtr
send-alerts
```

Elle synchronise les lignes, rafraîchit les consommations, purge les anciens snapshots et envoie les alertes de consommation.

## 4. Pré-requis

Installer :

- Node.js 20 ou supérieur ;
- npm ;
- un projet Supabase ;
- les identifiants API PHENIX ;
- Supabase CLI si les Edge Functions doivent être déployées.

## 5. Installation locale

Depuis PowerShell :

```powershell
cd D:\Dev\Phenix-Interface\Phenix_GSM
npm install
```

Créer ensuite le fichier `.env.local` à partir de l’exemple :

```powershell
Copy-Item .env.example .env.local
```

Puis renseigner les vraies valeurs dans `.env.local`.

Ne jamais committer `.env` ou `.env.local`.

## 6. Variables d’environnement

### Supabase côté application

```env
NEXT_PUBLIC_SUPABASE_URL="https://<project-ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon-or-publishable-key>"
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
```

`NEXT_PUBLIC_SUPABASE_URL` et la clé publique sont utilisées pour les sessions utilisateur.

`SUPABASE_SERVICE_ROLE_KEY` est réservée aux traitements serveur, webhooks et tâches d’administration.

### Connexion PostgreSQL pour le script de migration

```env
SUPABASE_DB_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres"
SUPABASE_DB_SSL="true"
```

`SUPABASE_DB_URL` doit être une URL PostgreSQL et non l’URL HTTP de l’API Supabase.

### API PHENIX

```env
PHENIX_API_BASE_URL="https://api.phenix-partner.fr"
PHENIX_USERNAME=""
PHENIX_PASSWORD=""
PHENIX_PARTENAIRE_ID=""
PHENIX_WEBHOOK_SECRET=""
PHENIX_CONFIG_ENCRYPTION_KEY=""
PHENIX_AUTH_STRICT_BODY="false"
PHENIX_AUTH_ERROR_COOLDOWN_MS="60000"
```

Les identifiants PHENIX peuvent aussi être enregistrés chiffrés dans `phenix_secure_config` depuis l’application.

### Maintenance SDTR

```env
PHENIX_MAINTENANCE_SECRET="change-me"
PHENIX_OWNER_USER_ID=""
SDTR_BATCH_SIZE="50"
SDTR_CONCURRENCY="4"
SDTR_STALE_AFTER_MS="3300000"
PHENIX_REQUEST_TIMEOUT_MS="25000"
```

### Email Resend

```env
RESEND_API_KEY="re_xxx"
RESEND_FROM="PHENIX <alerts@example.com>"
ALERT_ADMIN_EMAIL="admin@example.com"
RESEND_TIMEOUT_MS="20000"
```

### Pushover

```env
PUSHOVER_APP_TOKEN=""
PUSHOVER_USER_KEY=""
PUSHOVER_PRIORITY="1"
PUSHOVER_DEVICE=""
PUSHOVER_SOUND=""
PUSHOVER_TIMEOUT_MS="10000"
```

## 7. Initialiser la base Supabase

Pour une base neuve :

```powershell
npm run supabase:migrate:dry-run
```

Le script doit afficher un seul fichier :

```text
supabase\migrations\0001_init.sql
```

Puis appliquer le schéma :

```powershell
npm run supabase:migrate
```

Par sécurité, le script refuse normalement une base contenant déjà des tables du projet.

L’option suivante existe mais ne doit être utilisée qu’en connaissance de cause :

```powershell
npm run supabase:migrate -- --allow-existing
```

## 8. Créer l’administrateur

Configurer :

```env
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="mot-de-passe-fort"
ADMIN_DISPLAY_NAME="Administrateur"
```

Puis :

```powershell
npm run supabase:create-admin
```

Pour réinitialiser le mot de passe d’un compte existant :

```powershell
npm run supabase:create-admin -- --reset-password
```

## 9. Configurer les jobs Supabase Cron

Le schéma crée les jobs :

```text
phenix-sync-lines-daily
phenix-refresh-sdtr-hourly
phenix-purge-sdtr-weekly
phenix-alert-sdtr-hourly
```

Ils utilisent `pg_cron`, `pg_net` et les secrets Supabase Vault.

Créer dans Supabase :

```sql
select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
select vault.create_secret('<anon-or-publishable-key>', 'anon_key');
select vault.create_secret('<secret-long-et-aleatoire>', 'phenix_maintenance_cron_secret');
```

Le contenu de `phenix_maintenance_cron_secret` doit correspondre à `PHENIX_MAINTENANCE_SECRET` configuré pour l’Edge Function.

## 10. Déployer l’Edge Function

Se connecter au projet Supabase avec la CLI puis :

```powershell
supabase functions deploy phenix-maintenance
```

Configurer ensuite les secrets nécessaires :

```powershell
npm run supabase:set-edge-secrets
```

Le script transmet notamment les variables nécessaires à la fonction et transforme :

```text
NEXT_PUBLIC_SUPABASE_URL -> PROJECT_URL
SUPABASE_SERVICE_ROLE_KEY -> SERVICE_ROLE_KEY
```

## 11. Lancer l’application en développement

```powershell
cd D:\Dev\Phenix-Interface\Phenix_GSM
npm run dev
```

Puis ouvrir :

```text
http://localhost:3000
```

La racine redirige ensuite vers la connexion ou le dashboard selon la session.

## 12. Lancement production local

Construire :

```powershell
npm run build
```

Puis démarrer :

```powershell
npm run start
```

## 13. Vérifications développeur

```powershell
npm run lint
npm run typecheck
npm run test
```

Tests end-to-end :

```powershell
npm run e2e
```

## 14. Scripts disponibles

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Lance Next.js en développement avec Turbopack |
| `npm run build` | Build production |
| `npm run start` | Lance le build production |
| `npm run lint` | ESLint |
| `npm run typecheck` | Vérification TypeScript |
| `npm run test` | Tests Vitest |
| `npm run e2e` | Tests Playwright |
| `npm run supabase:migrate` | Applique le schéma Supabase |
| `npm run supabase:migrate:dry-run` | Affiche les fichiers SQL à exécuter |
| `npm run supabase:apply-sql` | Applique un fichier SQL spécifique |
| `npm run supabase:create-admin` | Crée ou promeut un administrateur |
| `npm run supabase:set-edge-secrets` | Configure les secrets de l’Edge Function |
| `npm run supabase:invoke-maintenance` | Invoque la maintenance PHENIX |
| `npm run supabase:verify-sdtr` | Vérifie le traitement SDTR / recharge |

## 15. Fichiers importants

```text
app/                                  pages Next.js et routes API
components/                           composants React
lib/phenix/                           client, auth et mapping API PHENIX
lib/supabase/                         clients Supabase serveur / navigateur
lib/security/                         chiffrement de la configuration PHENIX
server/                               actions serveur complémentaires
supabase/migrations/0001_init.sql     schéma SQL consolidé
supabase/functions/phenix-maintenance Edge Function de maintenance
scripts/                              scripts administration Supabase
.env.example                          modèle de configuration
```

## 16. Sécurité

À respecter :

- ne jamais exposer `SUPABASE_SERVICE_ROLE_KEY` au navigateur ;
- ne jamais importer les modules serveur PHENIX dans un composant `use client` ;
- ne jamais versionner `.env` ou `.env.local` ;
- protéger les webhooks avec `PHENIX_WEBHOOK_SECRET` ;
- utiliser une clé forte pour `PHENIX_CONFIG_ENCRYPTION_KEY` ;
- conserver RLS actif sur les tables exposées à Supabase Auth ;
- ne pas enregistrer de token ou mot de passe en clair dans les logs.

## 17. Nettoyage éditeur

Les métadonnées propres à Cursor ont été retirées du projet :

```text
.cursor/
.git/cursor/
```

`.cursor/` est désormais ignoré par Git.

Les occurrences comme `cursor-default`, `cursor-not-allowed` ou les dépendances `cli-cursor` ne sont pas liées à l’éditeur Cursor : ce sont des styles CSS ou des dépendances npm utiles, elles doivent donc rester présentes.

## Licence

Projet interne — droits réservés.
