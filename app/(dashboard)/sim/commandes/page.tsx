import { StubPage } from "@/components/cards/stub-page";

export default function Page() {
  return (
    <StubPage
      title="Commandes SIM"
      description="Création et suivi des commandes."
      endpoints={[
        "POST /GsmApi/SaveCommandeSim",
        "POST /GsmApi/SaveCommandeEsim",
        "GET /GsmApi/GetCommandeSimDetails",
        "GET /GsmApi/DeleteCommandeSim",
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
          apiHref: "/api/phenix/sim/commandes/delete",
          defaultJson: '{"idCommande":""}',
          cardTitle: "DeleteCommandeSim",
        },
      ]}
    />
  );
}
