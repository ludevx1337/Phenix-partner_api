import { StubPage } from "@/components/cards/stub-page";

export default function Page() {
  return (
    <StubPage
      title="Portabilités"
      description="Porta IN / OUT."
      endpoints={[
        "GET /GsmApi/V2/ConsulterPortaInList",
        "GET /GsmApi/V2/ConsulterPortaOutList",
      ]}
      tools={[
        {
          method: "GET",
          apiHref: "/api/phenix/portabilites/in",
          defaultJson: "{}",
          cardTitle: "Porta IN (liste)",
        },
        {
          method: "GET",
          apiHref: "/api/phenix/portabilites/out",
          defaultJson: "{}",
          cardTitle: "Porta OUT (liste)",
        },
      ]}
    />
  );
}
