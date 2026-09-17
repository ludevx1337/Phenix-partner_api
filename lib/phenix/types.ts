/** Types métier PHENIX (partiels — compléter selon doc officielle). */

export type PhenixOperator = "ORANGE" | "SFR" | "BTBD" | "PHENIX";

export type PhenixSimType =
  | "SIM"
  | "ESIM"
  | "SIM15D"
  | "SIM15D_IPFIXE"
  | "SIM15D_M2M"
  | "ESIM15D"
  | "ESIM15D_DataOnly";

export type GsmLineRow = {
  msisdn: string;
  iccid?: string | null;
  operateur?: string | null;
  etat?: string | null;
  partenaireId?: string | null;
  codeClient?: string | null;
  nomClient?: string | null;
  forfaitGsmCode?: string | null;
  codeTarifAchat?: string | null;
  ipFixe?: string | null;
  raw?: Record<string, unknown>;
};

export type PhenixApiErrorBody = {
  message?: string;
  code?: string;
  errors?: unknown;
};
