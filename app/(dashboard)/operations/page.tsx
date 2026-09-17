import { StubPage } from "@/components/cards/stub-page";

export default function Page() {
  return (
    <StubPage
      title="Opérations avancées"
      description="APN, opérateur, cutoff."
      endpoints={[
        "GET /GsmApi/V2/SwitchApn",
        "POST /GsmApi/V2/SwitchOPE",
        "POST /GsmApi/V2/MsisdnDeleteCutOff",
      ]}
      tools={[
        {
          method: "GET",
          apiHref: "/api/phenix/operations/switch-apn",
          defaultJson: '{"msisdn":"__MSISDN__"}',
          cardTitle: "Switch APN",
        },
        {
          method: "POST",
          apiHref: "/api/phenix/operations/switch-ope",
          defaultJson: '{"msisdn":"__MSISDN__"}',
          cardTitle: "Switch OPE",
        },
        {
          method: "POST",
          apiHref: "/api/phenix/operations/cutoff-debloc",
          defaultJson: '{"msisdn":"__MSISDN__"}',
          cardTitle: "Déblocage cutoff",
        },
      ]}
    />
  );
}
