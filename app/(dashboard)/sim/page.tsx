import { StubPage } from "@/components/cards/stub-page";

export default function Page() {
  return (
    <StubPage
      title="SIM / eSIM"
      description="Commandes et stock SIM / eSIM."
      endpoints={[
        "POST /GsmApi/SaveCommandeSim",
        "POST /GsmApi/SaveCommandeEsim",
        "GET /GsmApi/GetCommandeSimDetails",
        "GET /GsmApi/GetStockSimByCommandeSim",
        "GET /GsmApi/V2/GetInfoSimList",
      ]}
      tools={[
        {
          method: "POST",
          apiHref: "/api/phenix/sim/commandes/save-sim",
          defaultJson: "{}",
          cardTitle: "SaveCommandeSim",
        },
        {
          method: "POST",
          apiHref: "/api/phenix/sim/commandes/save-esim",
          defaultJson: "{}",
          cardTitle: "SaveCommandeEsim",
        },
        {
          method: "GET",
          apiHref: "/api/phenix/sim/commandes/details",
          defaultJson: '{"idCommande":""}',
          cardTitle: "GetCommandeSimDetails",
        },
        {
          method: "GET",
          apiHref: "/api/phenix/sim/commandes/stock",
          defaultJson: '{"idCommande":""}',
          cardTitle: "GetStockSimByCommandeSim",
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
