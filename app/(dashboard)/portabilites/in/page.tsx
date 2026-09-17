import { StubPage } from "@/components/cards/stub-page";

export default function Page() {
  return (
    <StubPage
      title="Porta IN"
      description="Liste entrantes."
      endpoints={[
        "GET /GsmApi/V2/ConsulterPortaInList",
        "POST /GsmApi/CancelPortaIN",
      ]}
      tools={[
        {
          method: "GET",
          apiHref: "/api/phenix/portabilites/in",
          defaultJson: "{}",
          cardTitle: "Liste Porta IN",
        },
        {
          method: "POST",
          apiHref: "/api/phenix/portabilites/cancel",
          defaultJson: "{}",
          cardTitle: "Annuler Porta IN",
        },
      ]}
    />
  );
}
