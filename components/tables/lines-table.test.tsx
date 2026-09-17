import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LinesTable } from "@/components/tables/lines-table";
import type { GsmLine } from "@/types/database";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

const sample: GsmLine[] = [
  {
    id: "1",
    user_id: "u",
    msisdn: "+33600000000",
    iccid: null,
    operateur: "ORANGE",
    etat: "active",
    options: null,
    partenaire_id: null,
    code_client: null,
    nom_client: "Société test",
    forfait_gsm_code: "CD-GSM-B29",
    code_tarif_achat: "GSM-SO1853-F",
    ip_fixe: null,
    raw_payload: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

describe("LinesTable", () => {
  it("affiche le MSISDN", () => {
    render(<LinesTable lines={sample} />);
    expect(screen.getByText("+33600000000")).toBeInTheDocument();
  });

  it("affiche client et forfait", () => {
    render(<LinesTable lines={sample} />);
    expect(screen.getByText("Société test")).toBeInTheDocument();
    expect(screen.getByText("CD-GSM-B29")).toBeInTheDocument();
    expect(screen.getByText("GSM-SO1853-F")).toBeInTheDocument();
  });
});
