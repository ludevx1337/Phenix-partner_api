import { StubPage } from "@/components/cards/stub-page";

export default function Page() {
  return (
    <StubPage
      title="Switch opérateur"
      description="SwitchOPE."
      endpoints={["POST /GsmApi/V2/SwitchOPE"]}
      tool={{
        method: "POST",
        apiHref: "/api/phenix/operations/switch-ope",
        defaultJson: '{"msisdn":"__MSISDN__"}',
        submitLabel: "Exécuter",
      }}
    />
  );
}
