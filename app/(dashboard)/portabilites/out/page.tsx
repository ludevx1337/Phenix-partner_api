import { StubPage } from "@/components/cards/stub-page";

export default function Page() {
  return (
    <StubPage
      title="Porta OUT"
      description="Liste sortantes et suppression commande GSM associée."
      endpoints={[
        "GET /GsmApi/V2/ConsulterPortaOutList",
        "POST /GsmApi/DeleteGsmCommande",
      ]}
      tools={[
        {
          method: "GET",
          apiHref: "/api/phenix/portabilites/out",
          defaultJson: "{}",
          cardTitle: "Liste Porta OUT",
        },
        {
          method: "POST",
          apiHref: "/api/phenix/commandes/gsm/delete",
          defaultJson: "{}",
          cardTitle: "DeleteGsmCommande",
        },
      ]}
    />
  );
}
