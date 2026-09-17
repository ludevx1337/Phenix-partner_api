"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { msisdnAddDataRechargeBodySchema } from "@/lib/phenix/schemas";

const formSchema = msisdnAddDataRechargeBodySchema;
type FormValues = z.input<typeof formSchema>;

function extractStringOptions(data: unknown): { value: string; label: string }[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data
      .map((item) => {
        if (typeof item === "string")
          return { value: item, label: item };
        if (item && typeof item === "object") {
          const o = item as Record<string, unknown>;
          const code =
            (typeof o.code === "string" && o.code) ||
            (typeof o.Code === "string" && o.Code) ||
            (typeof o.zone === "string" && o.zone) ||
            (typeof o.Zone === "string" && o.Zone) ||
            (typeof o.libelle === "string" && o.libelle) ||
            (typeof o.Libelle === "string" && o.Libelle);
          if (code) return { value: code, label: code };
        }
        return null;
      })
      .filter((x): x is { value: string; label: string } => x !== null);
  }
  if (typeof data === "object") {
    const o = data as Record<string, unknown>;
    for (const key of ["items", "Items", "zones", "Zones", "data", "Data"]) {
      const nested = o[key];
      const inner = extractStringOptions(nested);
      if (inner.length) return inner;
    }
  }
  return [];
}

export function NewDataRechargeForm() {
  const router = useRouter();
  const [zones, setZones] = useState<{ value: string; label: string }[]>([]);
  const [codes, setCodes] = useState<{ value: string; label: string }[]>([]);
  const [loadingZones, setLoadingZones] = useState(false);
  const [loadingCodes, setLoadingCodes] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      msisdn: "",
      operateur: "ORANGE",
      codeZone: "",
      codeRecharge: "",
      volumeDataEnMo: "",
    },
  });

  const operateur = form.watch("operateur");

  async function loadZones() {
    setLoadingZones(true);
    try {
      const res = await fetch(
        `/api/phenix/data-recharges/zones?operateur=${encodeURIComponent(operateur)}`,
      );
      const json: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error("Impossible de charger les zones");
        return;
      }
      const data =
        typeof json === "object" && json !== null && "data" in json
          ? (json as { data: unknown }).data
          : json;
      setZones(extractStringOptions(data));
      toast.success("Zones chargées");
    } finally {
      setLoadingZones(false);
    }
  }

  async function loadCodes() {
    setLoadingCodes(true);
    try {
      const res = await fetch(
        `/api/phenix/data-recharges/codes?operateur=${encodeURIComponent(operateur)}&codeZone=${encodeURIComponent(form.getValues("codeZone"))}`,
      );
      const json: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error("Impossible de charger les codes");
        return;
      }
      const data =
        typeof json === "object" && json !== null && "data" in json
          ? (json as { data: unknown }).data
          : json;
      setCodes(extractStringOptions(data));
      toast.success("Codes recharge chargés");
    } finally {
      setLoadingCodes(false);
    }
  }

  async function onSubmit(values: FormValues) {
    try {
      const res = await fetch("/api/phenix/data-recharges/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
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
      toast.success("Recharge DATA envoyée");
      form.reset({
        ...values,
        msisdn: "",
        codeZone: "",
        codeRecharge: "",
        volumeDataEnMo: "",
      });
      router.push("/recharges-data");
      router.refresh();
    } catch {
      toast.error("Échec de l’envoi");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-lg space-y-4">
        <FormField
          control={form.control}
          name="msisdn"
          render={({ field }) => (
            <FormItem>
              <FormLabel>MSISDN</FormLabel>
              <FormControl>
                <Input placeholder="+33612345678" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="operateur"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Opérateur</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Opérateur" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="ORANGE">ORANGE</SelectItem>
                  <SelectItem value="SFR">SFR</SelectItem>
                  <SelectItem value="BTBD">BTBD</SelectItem>
                  <SelectItem value="PHENIX">PHENIX</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={loadingZones}
            onClick={() => void loadZones()}
          >
            {loadingZones ? "Zones…" : "Charger zones PHENIX"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={loadingCodes}
            onClick={() => void loadCodes()}
          >
            {loadingCodes ? "Codes…" : "Charger codes PHENIX"}
          </Button>
        </div>
        <FormField
          control={form.control}
          name="codeZone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Zone</FormLabel>
              <FormControl>
                <>
                  <Input list="zones-phx" placeholder="Code zone" {...field} />
                  <datalist id="zones-phx">
                    {zones.map((z) => (
                      <option key={z.value} value={z.value} />
                    ))}
                  </datalist>
                </>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="volumeDataEnMo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Volume data en Mo (optionnel)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  placeholder="1024"
                  value={typeof field.value === "string" ? field.value : ""}
                  onChange={(e) => field.onChange(e.target.value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="codeRecharge"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Code recharge</FormLabel>
              <FormControl>
                <>
                  <Input list="codes-phx" placeholder="Code recharge" {...field} />
                  <datalist id="codes-phx">
                    {codes.map((c) => (
                      <option key={c.value} value={c.value} />
                    ))}
                  </datalist>
                </>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Envoyer recharge DATA</Button>
      </form>
    </Form>
  );
}
