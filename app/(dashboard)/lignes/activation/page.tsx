import { StubPage } from "@/components/cards/stub-page";

export default function Page() {
  return (
    <StubPage
      title="Activation ligne"
      description="MsisdnActivate (CreateNA / CreateNP)."
      endpoints={[
        "POST /GsmApi/V2/MsisdnActivate",
        "POST /GsmApi/ActivationCommandeGsmList",
      ]}
      tools={[
        {
          method: "POST",
          apiHref: "/api/phenix/lignes/activate",
          defaultJson: "{}",
          cardTitle: "MsisdnActivate",
          submitLabel: "Exécuter",
        },
        {
          method: "GET",
          apiHref: "/api/phenix/lignes/activation-commandes",
          defaultJson: "{}",
          cardTitle: "ActivationCommandeGsmList",
          submitLabel: "Lister",
        },
      ]}
    />
  );
}
