import { StubPage } from "@/components/cards/stub-page";

export default function Page() {
  return (
    <StubPage
      title="RIO"
      description="Consultation RIO."
      endpoints={["GET /GsmApi/V2/MsisdnConsultRio"]}
      tool={{
        method: "GET",
        apiHref: "/api/phenix/lignes/rio",
        defaultJson: '{"msisdn":"__MSISDN__"}',
        submitLabel: "Consulter RIO",
      }}
    />
  );
}
