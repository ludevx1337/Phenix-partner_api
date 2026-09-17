import { StubPage } from "@/components/cards/stub-page";

export default function Page() {
  return (
    <StubPage
      title="eSIM — commandes"
      description="Commandes eSIM."
      endpoints={["POST /GsmApi/SaveCommandeEsim", "GET /GsmApi/GetStockESim"]}
      tools={[
        {
          method: "POST",
          apiHref: "/api/phenix/sim/commandes/save-esim",
          defaultJson: "{}",
          cardTitle: "SaveCommandeEsim",
        },
        {
          method: "GET",
          apiHref: "/api/phenix/esim/stock",
          defaultJson: "{}",
          cardTitle: "GetStockESim",
        },
      ]}
    />
  );
}
