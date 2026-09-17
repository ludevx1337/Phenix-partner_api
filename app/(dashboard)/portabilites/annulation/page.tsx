import { StubPage } from "@/components/cards/stub-page";

export default function Page() {
  return (
    <StubPage
      title="Annulation Porta IN"
      description="CancelPortaIN."
      endpoints={["POST /GsmApi/CancelPortaIN"]}
      tool={{
        method: "POST",
        apiHref: "/api/phenix/portabilites/cancel",
        defaultJson: "{}",
        submitLabel: "Annuler",
      }}
    />
  );
}
