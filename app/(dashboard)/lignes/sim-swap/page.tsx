import { StubPage } from "@/components/cards/stub-page";

export default function Page() {
  return (
    <StubPage
      title="SIM Swap"
      description="SimSwap."
      endpoints={["POST /GsmApi/V2/SimSwap"]}
      tool={{
        method: "POST",
        apiHref: "/api/phenix/lignes/sim-swap",
        defaultJson:
          '{"msisdn":"__MSISDN__","serialNumber":"SERIAL_ICCID","requestId":""}',
        submitLabel: "SIM swap",
      }}
    />
  );
}
