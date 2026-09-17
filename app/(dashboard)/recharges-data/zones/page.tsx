import { StubPage } from "@/components/cards/stub-page";

export default function Page() {
  return (
    <StubPage
      title="Zones DATA"
      description="Zones par opérateur."
      endpoints={["GET /GsmApi/V2/GetZonesByOperator"]}
      tool={{
        method: "GET",
        apiHref: "/api/phenix/data-recharges/zones",
        defaultJson: '{"operateur":"ORANGE"}',
        submitLabel: "Lister les zones",
      }}
    />
  );
}
