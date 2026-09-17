import { StubPage } from "@/components/cards/stub-page";

export default function Page() {
  return (
    <StubPage
      title="Déblocage cutoff"
      description="MsisdnDeleteCutOff."
      endpoints={["POST /GsmApi/V2/MsisdnDeleteCutOff"]}
      tool={{
        method: "POST",
        apiHref: "/api/phenix/operations/cutoff-debloc",
        defaultJson: '{"msisdn":"__MSISDN__"}',
        submitLabel: "Exécuter",
      }}
    />
  );
}
