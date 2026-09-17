import { StubPage } from "@/components/cards/stub-page";

export default function Page() {
  return (
    <StubPage
      title="Consultation requête GSM"
      description="GsmRequestConsult — suivi d’une requête (identifiants selon doc PHENIX v2.9)."
      endpoints={["GET /GsmApi/V2/GsmRequestConsult"]}
      tool={{
        method: "GET",
        apiHref: "/api/phenix/lignes/gsm-request-consult",
        defaultJson: '{"idRequete":""}',
        submitLabel: "Consulter",
      }}
    />
  );
}
