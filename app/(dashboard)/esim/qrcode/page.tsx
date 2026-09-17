import { StubPage } from "@/components/cards/stub-page";

export default function Page() {
  return (
    <StubPage
      title="QR Code eSIM"
      description="Téléchargement QR (réponse JSON ou binaire selon PHENIX)."
      endpoints={[
        "GET /GsmApi/V2/DownloadEsimQRCodeBySimSN",
        "GET /GsmApi/V2/DownloadEsimQRCodeByMsisdn",
      ]}
      tools={[
        {
          method: "GET",
          apiHref: "/api/phenix/esim/qrcode/sim-sn",
          defaultJson: '{"simSerialNumber":""}',
          cardTitle: "QR par SN",
        },
        {
          method: "GET",
          apiHref: "/api/phenix/esim/qrcode/msisdn",
          defaultJson: '{"msisdn":"__MSISDN__"}',
          cardTitle: "QR par MSISDN",
        },
      ]}
    />
  );
}
