import { StubPage } from "@/components/cards/stub-page";

export default function Page() {
  return (
    <StubPage
      title="Stock SIM"
      description="Stock par commande."
      endpoints={[
        "GET /GsmApi/GetStockSimByCommandeSim",
        "GET /GsmApi/GetStockESim",
        "GET /GsmApi/V2/GetInfoSimList",
      ]}
      tools={[
        {
          method: "GET",
          apiHref: "/api/phenix/sim/commandes/stock",
          defaultJson: '{"idCommande":""}',
          cardTitle: "Stock SIM (commande)",
        },
        {
          method: "GET",
          apiHref: "/api/phenix/esim/stock",
          defaultJson: "{}",
          cardTitle: "Stock eSIM",
        },
        {
          method: "GET",
          apiHref: "/api/phenix/sim/info-list",
          defaultJson: "{}",
          cardTitle: "GetInfoSimList",
        },
      ]}
    />
  );
}
