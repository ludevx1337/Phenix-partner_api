"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  method: "GET" | "POST";
  /** Peut contenir `__MSISDN__` remplacé par le paramètre d’URL `?msisdn=`. */
  apiHref: string;
  /** POST : corps JSON. GET : paramètres de requête en JSON plat (clé → valeur). */
  defaultJson?: string;
  submitLabel?: string;
  /**
   * MSISDN fixe (priorité sur `?msisdn=` dans l’URL) — utile fiche ligne / SSR.
   */
  msisdn?: string | null;
};

function applyMsisdn(href: string, msisdn: string | null): string {
  if (!msisdn) return href;
  return href.split("__MSISDN__").join(encodeURIComponent(msisdn));
}

export function JsonPhoenixTool({
  method,
  apiHref,
  defaultJson = "{}",
  submitLabel = "Exécuter",
  msisdn: msisdnProp,
}: Props) {
  const searchParams = useSearchParams();
  const fromUrl = searchParams.get("msisdn");
  const trimmedProp = msisdnProp?.trim() ?? "";
  const effectiveMsisdn =
    trimmedProp.length > 0 ? trimmedProp : fromUrl?.trim() ?? null;
  const [body, setBody] = useState(defaultJson);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    if (!effectiveMsisdn || !defaultJson.includes("__MSISDN__")) return;
    setBody(defaultJson.replace(/__MSISDN__/g, effectiveMsisdn));
  }, [effectiveMsisdn, defaultJson]);

  async function run() {
    setLoading(true);
    setResult(null);
    try {
      const href = applyMsisdn(apiHref, effectiveMsisdn);
      let url = href;
      const init: RequestInit = { method, cache: "no-store" };

      if (method === "POST") {
        let parsed: unknown;
        try {
          parsed = JSON.parse(body || "{}") as unknown;
        } catch {
          toast.error("JSON invalide");
          setLoading(false);
          return;
        }
        init.headers = { "Content-Type": "application/json" };
        init.body = JSON.stringify(parsed);
      } else {
        let parsed: Record<string, unknown> = {};
        if (body.trim()) {
          try {
            parsed = JSON.parse(body) as Record<string, unknown>;
          } catch {
            toast.error("JSON des paramètres GET invalide");
            setLoading(false);
            return;
          }
        }
        const usp = new URLSearchParams();
        for (const [k, v] of Object.entries(parsed)) {
          if (v === undefined || v === null) continue;
          const s = String(v);
          if (s !== "") usp.set(k, s);
        }
        const q = usp.toString();
        if (q) url += (url.includes("?") ? "&" : "?") + q;
      }

      const res = await fetch(url, init);
      const text = await res.text();
      let pretty = text;
      try {
        pretty = JSON.stringify(JSON.parse(text) as unknown, null, 2);
      } catch {
        // garder brut
      }
      setResult(pretty);
      if (!res.ok) {
        toast.error(`Erreur ${res.status}`);
        return;
      }
      toast.success("Requête terminée");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        spellCheck={false}
        className={cn(
          "border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring/50 min-h-[160px] w-full resize-y rounded-lg border px-3 py-2 font-mono text-xs leading-relaxed shadow-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-[3px]",
        )}
        aria-label={method === "POST" ? "Corps JSON" : "Paramètres GET (JSON)"}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={loading} onClick={() => void run()}>
          {loading ? "En cours…" : submitLabel}
        </Button>
      </div>
      {result ? (
        <pre className="bg-muted max-h-[min(28rem,55vh)] overflow-auto rounded-lg border p-3 font-mono text-xs leading-relaxed">
          {result}
        </pre>
      ) : null}
    </div>
  );
}
