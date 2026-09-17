import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function LigneNotFound() {
  return (
    <div className="flex flex-col items-start gap-4 py-12">
      <h1 className="text-2xl font-semibold">Ligne introuvable</h1>
      <p className="text-muted-foreground text-sm">
        Ce MSISDN n’est pas présent dans votre cache local. Synchronisez depuis
        PHENIX.
      </p>
      <Link
        href="/lignes"
        className={cn(buttonVariants({ variant: "default" }))}
      >
        Retour aux lignes
      </Link>
    </div>
  );
}
