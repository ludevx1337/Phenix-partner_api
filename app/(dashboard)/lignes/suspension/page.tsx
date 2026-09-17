import { StubPage } from "@/components/cards/stub-page";

export default function Page() {
  return (
    <StubPage
      title="Suspension"
      description="MsisdnSuspend."
      endpoints={["POST /GsmApi/V2/MsisdnSuspend"]}
      tool={{
        method: "POST",
        apiHref: "/api/phenix/lines/suspend",
        defaultJson: '{"msisdn":"__MSISDN__"}',
        submitLabel: "Suspendre",
      }}
    />
  );
}
