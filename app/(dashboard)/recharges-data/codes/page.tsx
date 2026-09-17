import { StubPage } from "@/components/cards/stub-page";

export default function Page() {
  return (
    <StubPage
      title="Codes recharge"
      description="Liste par opérateur / MSISDN."
      endpoints={[
        "GET /GsmApi/V2/GetDataRechargesByOperator",
        "GET /GsmApi/V2/GetDataRechargesByMsisdn",
      ]}
      tools={[
        {
          method: "GET",
          apiHref: "/api/phenix/data-recharges/codes",
          defaultJson: '{"operateur":"ORANGE"}',
          cardTitle: "Par opérateur",
        },
        {
          method: "GET",
          apiHref: "/api/phenix/data-recharges/by-msisdn",
          defaultJson: '{"msisdn":"__MSISDN__"}',
          cardTitle: "Par MSISDN",
        },
      ]}
    />
  );
}
