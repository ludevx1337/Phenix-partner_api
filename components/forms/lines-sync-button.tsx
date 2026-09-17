"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
export function LinesSyncButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function sync() {
    setLoading(true);
    try {
      const res = await fetch("/api/phenix/lines/consult-all", { method: "GET" });
      const json: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof json === "object" &&
          json !== null &&
          "error" in json &&
          typeof (json as { error?: unknown }).error === "string"
            ? (json as { error: string }).error
            : `Erreur ${res.status}`;
        toast.error(msg);
        return;
      }
      toast.success("Lignes synchronisées depuis PHENIX");
      router.refresh();
    } catch {
      toast.error("Échec de la synchronisation");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      disabled={loading}
      onClick={() => void sync()}
    >
      <RefreshCw
        className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`}
        aria-hidden
      />
      Synchroniser PHENIX
    </Button>
  );
}
