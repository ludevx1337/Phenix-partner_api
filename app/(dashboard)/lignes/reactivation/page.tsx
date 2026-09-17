import { StubPage } from "@/components/cards/stub-page";

export default function Page() {
  return (
    <StubPage
      title="Réactivation"
      description="MsisdnResume."
      endpoints={["POST /GsmApi/V2/MsisdnResume"]}
      tool={{
        method: "POST",
        apiHref: "/api/phenix/lines/resume",
        defaultJson: '{"msisdn":"__MSISDN__"}',
        submitLabel: "Réactiver",
      }}
    />
  );
}
