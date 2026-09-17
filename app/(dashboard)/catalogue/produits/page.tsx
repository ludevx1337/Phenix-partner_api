import { StubPage } from "@/components/cards/stub-page";

export default function Page() {
  return (
    <StubPage
      title="Produits GSM"
      description="GetGsmProduitsByOperator."
      endpoints={["GET /GsmApi/V2/GetGsmProduitsByOperator"]}
      tool={{
        method: "GET",
        apiHref: "/api/phenix/catalogue/produits",
        defaultJson: '{"operateur":"ORANGE"}',
        submitLabel: "Lister",
      }}
    />
  );
}
