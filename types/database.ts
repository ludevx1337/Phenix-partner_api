/** Sous-ensemble typé aligné sur la table `gsm_lines` (sans codegen Supabase). */
export type GsmLine = {
  id: string;
  user_id: string;
  msisdn: string;
  iccid: string | null;
  operateur: string | null;
  etat: string | null;
  options: unknown;
  partenaire_id: string | null;
  code_client: string | null;
  /** Présents après migration `0005_gsm_lines_catalog_fields` + sync PHENIX. */
  nom_client?: string | null;
  forfait_gsm_code?: string | null;
  code_tarif_achat?: string | null;
  ip_fixe?: string | null;
  /** Dernier snapshot SdtrConso (`{ data: zones[] }`). */
  sdtr_conso?: unknown;
  sdtr_conso_updated_at?: string | null;
  raw_payload: unknown;
  created_at: string;
  updated_at: string;
  latest_sdtr?: GsmLineSdtrSnapshot | null;
};

export type GsmLineSdtrSnapshot = {
  id: string;
  user_id: string;
  line_id: string;
  msisdn: string;
  captured_at: string;
  payload: unknown;
  used_value_go: number | string | null;
  rest_value_go: number | string | null;
  total_value_go: number | string | null;
  usage_percent: number | string | null;
  recharge_value_go: number | string | null;
  recharge_label: string | null;
};
