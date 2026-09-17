import { StubPage } from "@/components/cards/stub-page";

export default function Page() {
  return (
    <StubPage
      title="Switch APN"
      description="SwitchApn."
      endpoints={["GET /GsmApi/V2/SwitchApn"]}
      tool={{
        method: "GET",
        apiHref: "/api/phenix/operations/switch-apn",
        defaultJson: '{"msisdn":"__MSISDN__"}',
        submitLabel: "Exécuter",
      }}
    />
  );
}
