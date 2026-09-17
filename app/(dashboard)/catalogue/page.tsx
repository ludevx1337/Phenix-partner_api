import { StubPage } from "@/components/cards/stub-page";

export default function Page() {
  return (
    <StubPage
      title="Catalogue"
      description="Produits, clients, profils."
      endpoints={[
        "GET /GsmApi/V2/GetGsmProduitsByOperator",
        "POST /GsmApi/SearchCustomer",
        "GET /GsmApi/GetGsmProfilById",
      ]}
      tools={[
        {
          method: "GET",
          apiHref: "/api/phenix/catalogue/produits",
          defaultJson: '{"operateur":"ORANGE"}',
          cardTitle: "Produits par opérateur",
        },
        {
          method: "POST",
          apiHref: "/api/phenix/catalogue/search-customer",
          defaultJson: "{}",
          cardTitle: "Recherche client",
        },
        {
          method: "GET",
          apiHref: "/api/phenix/catalogue/profil",
          defaultJson: '{"idProfil":""}',
          cardTitle: "Profil par id",
        },
      ]}
    />
  );
}
