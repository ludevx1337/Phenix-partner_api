-- PHENIX GSM - schema Supabase consolide
-- Fichier unique pour une installation neuve. Les anciennes migrations 0001-0008
-- ont ete fusionnees ci-dessous dans leur ordre d execution original.
-- Ne pas reexecuter tel quel sur une base deja initialisee.
-- ============================================================================
-- Source historique: 0001_init.sql
-- ============================================================================
-- PHENIX GSM — schéma initial
-- Extensions
create extension if not exists "pgcrypto";

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Profiles (1:1 auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Nouvel utilisateur → profil
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      split_part(coalesce(new.email, ''), '@', 1)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- phenix_api_logs
create table public.phenix_api_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  endpoint text not null,
  method text not null default 'GET',
  request_payload jsonb,
  response_status integer,
  response_payload jsonb,
  duration_ms integer,
  request_id text,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger phenix_api_logs_set_updated_at
before update on public.phenix_api_logs
for each row execute function public.set_updated_at();

create index idx_phenix_api_logs_user_created on public.phenix_api_logs (user_id, created_at desc);
create index idx_phenix_api_logs_request_id on public.phenix_api_logs (request_id);

-- gsm_lines
create table public.gsm_lines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  msisdn text not null,
  iccid text,
  operateur text,
  etat text,
  options jsonb,
  partenaire_id text,
  code_client text,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, msisdn)
);

create trigger gsm_lines_set_updated_at
before update on public.gsm_lines
for each row execute function public.set_updated_at();

create index idx_gsm_lines_msisdn on public.gsm_lines (msisdn);
create index idx_gsm_lines_operateur on public.gsm_lines (operateur);
create index idx_gsm_lines_partenaire on public.gsm_lines (partenaire_id);
create index idx_gsm_lines_code_client on public.gsm_lines (code_client);
create index idx_gsm_lines_created on public.gsm_lines (created_at desc);

-- gsm_line_history
create table public.gsm_line_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  msisdn text not null,
  action text not null,
  payload jsonb,
  request_id text,
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger gsm_line_history_set_updated_at
before update on public.gsm_line_history
for each row execute function public.set_updated_at();

create index idx_gsm_line_history_msisdn on public.gsm_line_history (msisdn);
create index idx_gsm_line_history_request on public.gsm_line_history (request_id);
create index idx_gsm_line_history_created on public.gsm_line_history (created_at desc);

-- data_recharges
create table public.data_recharges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  msisdn text not null,
  zone text,
  code_recharge text,
  volume_mb integer,
  statut text,
  recharge_date timestamptz,
  partenaire_id text,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger data_recharges_set_updated_at
before update on public.data_recharges
for each row execute function public.set_updated_at();

create index idx_data_recharges_msisdn on public.data_recharges (msisdn);
create index idx_data_recharges_created on public.data_recharges (created_at desc);
create index idx_data_recharges_partenaire on public.data_recharges (partenaire_id);

-- data_recharge_history
create table public.data_recharge_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  msisdn text not null,
  action text not null,
  payload jsonb,
  request_id text,
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger data_recharge_history_set_updated_at
before update on public.data_recharge_history
for each row execute function public.set_updated_at();

create index idx_data_recharge_history_msisdn on public.data_recharge_history (msisdn);
create index idx_data_recharge_history_created on public.data_recharge_history (created_at desc);

-- sim_orders
create table public.sim_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  commande_id text,
  type_sim text,
  quantity integer,
  statut text,
  operateur text,
  partenaire_id text,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger sim_orders_set_updated_at
before update on public.sim_orders
for each row execute function public.set_updated_at();

create index idx_sim_orders_commande on public.sim_orders (commande_id);
create index idx_sim_orders_created on public.sim_orders (created_at desc);

-- esim_orders
create table public.esim_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  commande_id text,
  type_sim text,
  quantity integer,
  statut text,
  operateur text,
  partenaire_id text,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger esim_orders_set_updated_at
before update on public.esim_orders
for each row execute function public.set_updated_at();

create index idx_esim_orders_commande on public.esim_orders (commande_id);
create index idx_esim_orders_created on public.esim_orders (created_at desc);

-- sim_stock
create table public.sim_stock (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  commande_id text,
  sim_serial text,
  iccid text,
  statut text,
  operateur text,
  partenaire_id text,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger sim_stock_set_updated_at
before update on public.sim_stock
for each row execute function public.set_updated_at();

create index idx_sim_stock_commande on public.sim_stock (commande_id);
create index idx_sim_stock_created on public.sim_stock (created_at desc);

-- gsm_requests
create table public.gsm_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  request_id text,
  type text,
  etat text,
  etat_etape text,
  msisdn text,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger gsm_requests_set_updated_at
before update on public.gsm_requests
for each row execute function public.set_updated_at();

create index idx_gsm_requests_request on public.gsm_requests (request_id);
create index idx_gsm_requests_msisdn on public.gsm_requests (msisdn);
create index idx_gsm_requests_created on public.gsm_requests (created_at desc);

-- portabilities
create table public.portabilities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  sens text not null check (sens in ('IN', 'OUT')),
  msisdn text,
  rio text,
  porta_etat text,
  porta_status text,
  porta_etat_etape text,
  porta_date timestamptz,
  partenaire_id text,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger portabilities_set_updated_at
before update on public.portabilities
for each row execute function public.set_updated_at();

create index idx_portabilities_msisdn on public.portabilities (msisdn);
create index idx_portabilities_created on public.portabilities (created_at desc);

-- esim_qrcodes
create table public.esim_qrcodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  msisdn text,
  sim_serial text,
  activation_code text,
  qr_pdf_path text,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger esim_qrcodes_set_updated_at
before update on public.esim_qrcodes
for each row execute function public.set_updated_at();

create index idx_esim_qrcodes_msisdn on public.esim_qrcodes (msisdn);
create index idx_esim_qrcodes_sim on public.esim_qrcodes (sim_serial);

-- notifications (webhooks — user_id nullable)
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}',
  received_at timestamptz not null default now(),
  read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger notifications_set_updated_at
before update on public.notifications
for each row execute function public.set_updated_at();

create index idx_notifications_event on public.notifications (event_type);
create index idx_notifications_received on public.notifications (received_at desc);

-- customers
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  code_client text,
  libelle text,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

create index idx_customers_code on public.customers (code_client);
create index idx_customers_created on public.customers (created_at desc);

-- gsm_products
create table public.gsm_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  operateur text,
  produit_id text,
  libelle text,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger gsm_products_set_updated_at
before update on public.gsm_products
for each row execute function public.set_updated_at();

create index idx_gsm_products_operateur on public.gsm_products (operateur);
create index idx_gsm_products_created on public.gsm_products (created_at desc);

-- gsm_profiles
create table public.gsm_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  profil_id text,
  libelle text,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger gsm_profiles_set_updated_at
before update on public.gsm_profiles
for each row execute function public.set_updated_at();

create index idx_gsm_profiles_profil on public.gsm_profiles (profil_id);
create index idx_gsm_profiles_created on public.gsm_profiles (created_at desc);

-- RLS
alter table public.profiles enable row level security;
alter table public.phenix_api_logs enable row level security;
alter table public.gsm_lines enable row level security;
alter table public.gsm_line_history enable row level security;
alter table public.data_recharges enable row level security;
alter table public.data_recharge_history enable row level security;
alter table public.sim_orders enable row level security;
alter table public.esim_orders enable row level security;
alter table public.sim_stock enable row level security;
alter table public.gsm_requests enable row level security;
alter table public.portabilities enable row level security;
alter table public.esim_qrcodes enable row level security;
alter table public.notifications enable row level security;
alter table public.customers enable row level security;
alter table public.gsm_products enable row level security;
alter table public.gsm_profiles enable row level security;

-- Policies: accès par user_id = auth.uid()
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

create policy "phenix_api_logs_all_own" on public.phenix_api_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "gsm_lines_all_own" on public.gsm_lines for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "gsm_line_history_all_own" on public.gsm_line_history for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "data_recharges_all_own" on public.data_recharges for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "data_recharge_history_all_own" on public.data_recharge_history for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "sim_orders_all_own" on public.sim_orders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "esim_orders_all_own" on public.esim_orders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "sim_stock_all_own" on public.sim_stock for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "gsm_requests_all_own" on public.gsm_requests for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "portabilities_all_own" on public.portabilities for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "esim_qrcodes_all_own" on public.esim_qrcodes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Notifications : lecture pour tout utilisateur authentifié (flux webhooks partagé mono-tenant)
create policy "notifications_select_auth" on public.notifications for select to authenticated using (true);
create policy "notifications_update_own_or_admin" on public.notifications for update to authenticated using (true) with check (true);

create policy "customers_all_own" on public.customers for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "gsm_products_all_own" on public.gsm_products for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "gsm_profiles_all_own" on public.gsm_profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- Source historique: 0002_phenix_token_cache.sql
-- ============================================================================
-- Cache persistant du token PHENIX (singleton)
create table if not exists public.phenix_token_cache (
  id smallint primary key default 1 check (id = 1),
  access_token text,
  token_type text,
  generated_at timestamptz,
  expires_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger phenix_token_cache_set_updated_at
before update on public.phenix_token_cache
for each row execute function public.set_updated_at();

alter table public.phenix_token_cache enable row level security;

-- ============================================================================
-- Source historique: 0003_phenix_token_retry_cooldown.sql
-- ============================================================================
alter table public.phenix_token_cache
add column if not exists last_error_at timestamptz,
add column if not exists next_retry_at timestamptz;

-- ============================================================================
-- Source historique: 0004_phenix_secure_config.sql
-- ============================================================================
create table if not exists public.phenix_secure_config (
  id smallint primary key default 1 check (id = 1),
  username_enc text not null,
  password_enc text not null,
  partenaire_id_enc text not null,
  configured_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger phenix_secure_config_set_updated_at
before update on public.phenix_secure_config
for each row execute function public.set_updated_at();

alter table public.phenix_secure_config enable row level security;

-- ============================================================================
-- Source historique: 0005_gsm_lines_catalog_fields.sql
-- ============================================================================
-- Champs catalogue / client exposés depuis MsisdnConsultAll (PHENIX).
alter table public.gsm_lines
  add column if not exists nom_client text,
  add column if not exists forfait_gsm_code text,
  add column if not exists code_tarif_achat text,
  add column if not exists ip_fixe text;

create index if not exists idx_gsm_lines_forfait on public.gsm_lines (forfait_gsm_code);

-- ============================================================================
-- Source historique: 0006_gsm_lines_sdtr_conso.sql
-- ============================================================================
-- Snapshot consommation SDTR (SdtrConso) par ligne, rafraîchi à l’ouverture de la fiche.
alter table public.gsm_lines
  add column if not exists sdtr_conso jsonb,
  add column if not exists sdtr_conso_updated_at timestamptz;

comment on column public.gsm_lines.sdtr_conso is 'Dernier corps normalisé SdtrConso (clé data: zones).';
comment on column public.gsm_lines.sdtr_conso_updated_at is 'Horodatage dernière synchro SDTR depuis la fiche ligne.';

-- ============================================================================
-- Source historique: 0007_gsm_line_sdtr_snapshots.sql
-- ============================================================================
-- Historique horaire SDTR par ligne + jobs Supabase Cron.
create extension if not exists "pgcrypto";
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

create table if not exists public.gsm_line_sdtr_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  line_id uuid references public.gsm_lines (id) on delete cascade,
  msisdn text not null,
  captured_at timestamptz not null default now(),
  payload jsonb not null default '{"data":[]}'::jsonb,
  used_value_go numeric,
  rest_value_go numeric,
  total_value_go numeric,
  usage_percent numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gsm_line_sdtr_snapshots_usage_percent_check
    check (usage_percent is null or (usage_percent >= 0 and usage_percent <= 100))
);

create trigger gsm_line_sdtr_snapshots_set_updated_at
before update on public.gsm_line_sdtr_snapshots
for each row execute function public.set_updated_at();

create index if not exists idx_sdtr_snapshots_line_captured
  on public.gsm_line_sdtr_snapshots (line_id, captured_at desc);

create index if not exists idx_sdtr_snapshots_user_captured
  on public.gsm_line_sdtr_snapshots (user_id, captured_at desc);

create index if not exists idx_sdtr_snapshots_msisdn_captured
  on public.gsm_line_sdtr_snapshots (msisdn, captured_at desc);

create index if not exists idx_sdtr_snapshots_usage
  on public.gsm_line_sdtr_snapshots (usage_percent)
  where usage_percent is not null;

alter table public.gsm_line_sdtr_snapshots enable row level security;

create policy "sdtr_snapshots_select_own"
on public.gsm_line_sdtr_snapshots
for select
using (auth.uid() = user_id);

create policy "sdtr_snapshots_insert_own"
on public.gsm_line_sdtr_snapshots
for insert
with check (auth.uid() = user_id);

create policy "sdtr_snapshots_update_own"
on public.gsm_line_sdtr_snapshots
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "sdtr_snapshots_delete_own"
on public.gsm_line_sdtr_snapshots
for delete
using (auth.uid() = user_id);

drop view if exists public.gsm_line_latest_sdtr;
create view public.gsm_line_latest_sdtr
with (security_invoker = true)
as
select distinct on (s.line_id)
  s.id,
  s.user_id,
  s.line_id,
  s.msisdn,
  s.captured_at,
  s.payload,
  s.used_value_go,
  s.rest_value_go,
  s.total_value_go,
  s.usage_percent
from public.gsm_line_sdtr_snapshots s
where s.line_id is not null
order by s.line_id, s.captured_at desc;

comment on table public.gsm_line_sdtr_snapshots is
  'Snapshots horaires SDTR dédiés, purgés au début de chaque semaine.';

comment on view public.gsm_line_latest_sdtr is
  'Dernier snapshot SDTR par ligne, utilisé par le tableau des lignes.';

-- Les jobs ci-dessous attendent trois secrets Vault :
-- project_url = https://<project-ref>.supabase.co
-- anon_key = clé publishable/anon Supabase utilisée pour invoquer l'Edge Function
-- phenix_maintenance_cron_secret = secret partagé avec PHENIX_MAINTENANCE_SECRET
select cron.unschedule(jobname)
from cron.job
where jobname in (
  'phenix-sync-lines-daily',
  'phenix-refresh-sdtr-hourly',
  'phenix-purge-sdtr-weekly',
  'phenix-alert-sdtr-hourly'
);

select cron.schedule(
  'phenix-sync-lines-daily',
  '15 2 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/phenix-maintenance',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key'),
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'phenix_maintenance_cron_secret')
    ),
    body := '{"action":"sync-lines"}'::jsonb,
    timeout_milliseconds := 300000
  );
  $$
);

select cron.schedule(
  'phenix-refresh-sdtr-hourly',
  '5 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/phenix-maintenance',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key'),
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'phenix_maintenance_cron_secret')
    ),
    body := '{"action":"refresh-sdtr"}'::jsonb,
    timeout_milliseconds := 300000
  );
  $$
);

select cron.schedule(
  'phenix-purge-sdtr-weekly',
  '10 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/phenix-maintenance',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key'),
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'phenix_maintenance_cron_secret')
    ),
    body := '{"action":"purge-sdtr"}'::jsonb,
    timeout_milliseconds := 300000
  );
  $$
);

select cron.schedule(
  'phenix-alert-sdtr-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/phenix-maintenance',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_key'),
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'phenix_maintenance_cron_secret')
    ),
    body := '{"action":"send-alerts"}'::jsonb,
    timeout_milliseconds := 300000
  );
  $$
);

-- ============================================================================
-- Source historique: 0008_gsm_line_sdtr_recharge_fields.sql
-- ============================================================================
-- Champs dédiés aux recharges DATA détectées dans les snapshots SDTR.
alter table public.gsm_line_sdtr_snapshots
  add column if not exists recharge_value_go numeric,
  add column if not exists recharge_label text;

with recharge_by_snapshot as (
  select
    s.id,
    round(
      sum(
        case
          when zone.value ? 'recharge'
            and (zone.value ->> 'recharge') ~ '^[0-9]+([.,][0-9]+)?$'
            and replace(zone.value ->> 'recharge', ',', '.')::numeric > 0
          then
            case
              when replace(zone.value ->> 'recharge', ',', '.')::numeric >= 1024
              then replace(zone.value ->> 'recharge', ',', '.')::numeric / 1024
              else replace(zone.value ->> 'recharge', ',', '.')::numeric
            end
          else null
        end
      ),
      2
    ) as recharge_value_go,
    string_agg(
      distinct nullif(
        coalesce(
          zone.value ->> 'sRecharge',
          zone.value ->> 'rechargeText',
          zone.value ->> 'rechargeValueText'
        ),
        ''
      ),
      ' + '
    ) as recharge_label
  from public.gsm_line_sdtr_snapshots s
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(s.payload -> 'data') = 'array'
      then s.payload -> 'data'
      else '[]'::jsonb
    end
  ) as zone(value)
  group by s.id
)
update public.gsm_line_sdtr_snapshots s
set
  recharge_value_go = r.recharge_value_go,
  recharge_label = coalesce(r.recharge_label, r.recharge_value_go::text || ' Go')
from recharge_by_snapshot r
where s.id = r.id
  and r.recharge_value_go is not null
  and r.recharge_value_go > 0;

drop view if exists public.gsm_line_latest_sdtr;
create view public.gsm_line_latest_sdtr
with (security_invoker = true)
as
select distinct on (s.line_id)
  s.id,
  s.user_id,
  s.line_id,
  s.msisdn,
  s.captured_at,
  s.payload,
  s.used_value_go,
  s.rest_value_go,
  s.total_value_go,
  s.usage_percent,
  s.recharge_value_go,
  s.recharge_label
from public.gsm_line_sdtr_snapshots s
where s.line_id is not null
order by s.line_id, s.captured_at desc;

comment on column public.gsm_line_sdtr_snapshots.recharge_value_go is
  'Volume de recharge DATA détecté dans SdtrConso, exprimé en Go.';

comment on column public.gsm_line_sdtr_snapshots.recharge_label is
  'Libellé PHENIX de la recharge DATA, par exemple "50 Go".';
