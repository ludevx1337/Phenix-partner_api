import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NewDataRechargeForm } from "@/components/forms/new-data-recharge-form";

export default function NouvelleRechargePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Nouvelle recharge DATA
        </h1>
        <p className="text-muted-foreground text-sm">
          Formulaire validé côté client (Zod) puis envoi à la route interne
          sécurisée.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>MsisdnAddDataRecharge</CardTitle>
          <CardDescription>
            Charger zones / codes depuis PHENIX puis soumettre.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewDataRechargeForm />
        </CardContent>
      </Card>
    </div>
  );
}
