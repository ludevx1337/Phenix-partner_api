import { StubPage } from "@/components/cards/stub-page";

export default function Page() {
  return (
    <StubPage
      title="Profils"
      description="GetGsmProfilById."
      endpoints={["GET /GsmApi/GetGsmProfilById"]}
      tool={{
        method: "GET",
        apiHref: "/api/phenix/catalogue/profil",
        defaultJson: '{"idProfil":""}',
        submitLabel: "Consulter",
      }}
    />
  );
}
