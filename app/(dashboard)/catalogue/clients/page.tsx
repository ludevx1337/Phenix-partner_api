import { StubPage } from "@/components/cards/stub-page";

export default function Page() {
  return (
    <StubPage
      title="Clients"
      description="SearchCustomer."
      endpoints={["POST /GsmApi/SearchCustomer"]}
      tool={{
        method: "POST",
        apiHref: "/api/phenix/catalogue/search-customer",
        defaultJson: "{}",
        submitLabel: "Rechercher",
      }}
    />
  );
}
