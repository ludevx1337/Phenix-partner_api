import { StubPage } from "@/components/cards/stub-page";

export default function Page() {
  return (
    <StubPage
      title="Résiliation"
      description="MsisdnDelete."
      endpoints={["POST /GsmApi/V2/MsisdnDelete"]}
      tool={{
        method: "POST",
        apiHref: "/api/phenix/lignes/delete",
        defaultJson: '{"msisdn":"__MSISDN__"}',
        submitLabel: "Résilier",
      }}
    />
  );
}
