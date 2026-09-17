import { StubPage } from "@/components/cards/stub-page";

export default function Page() {
  return (
    <StubPage
      title="eSIM"
      description="Activation et QR."
      endpoints={[
        "GET /GsmApi/GetEsimActivationCodeBySimSN",
        "GET /GsmApi/GetEsimActivationCodeByMsisdn",
      ]}
      tools={[
        {
          method: "GET",
          apiHref: "/api/phenix/esim/activation-code/sim-sn",
          defaultJson: '{"simSerialNumber":""}',
          cardTitle: "Code activation (SN carte)",
        },
        {
          method: "GET",
          apiHref: "/api/phenix/esim/activation-code/msisdn",
          defaultJson: '{"msisdn":"__MSISDN__"}',
          cardTitle: "Code activation (MSISDN)",
        },
      ]}
    />
  );
}
