import { StubPage } from "@/components/cards/stub-page";

export default function Page() {
  return (
    <StubPage
      title="Modification options"
      description="MsisdnModifyOptions / AddDeleteOptions."
      endpoints={[
        "POST /GsmApi/V2/MsisdnModifyOptions",
        "POST /GsmApi/V2/MsisdnAddDeleteOptions",
        "GET /GsmApi/V2/GetGsmProduitsByOperator",
      ]}
      tools={[
        {
          method: "POST",
          apiHref: "/api/phenix/lignes/modify-options",
          defaultJson: '{"msisdn":"__MSISDN__"}',
          cardTitle: "ModifyOptions",
        },
        {
          method: "POST",
          apiHref: "/api/phenix/lignes/add-delete-options",
          defaultJson: '{"msisdn":"__MSISDN__"}',
          cardTitle: "AddDeleteOptions",
        },
        {
          method: "GET",
          apiHref: "/api/phenix/catalogue/produits",
          defaultJson: '{"operateur":"ORANGE"}',
          cardTitle: "Produits (référence)",
          submitLabel: "Lister produits",
        },
      ]}
    />
  );
}
