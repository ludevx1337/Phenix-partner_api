"use client";

import * as Popover from "@radix-ui/react-popover";
import { CheckCircle2, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  value: string | null | undefined;
};

function hasIp(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function IpFixeCell({ value }: Props) {
  if (!hasIp(value)) {
    return (
      <span className="text-muted-foreground tabular-nums" aria-label="Pas d’IP fixe">
        —
      </span>
    );
  }

  const ip = value.trim();

  async function copy() {
    try {
      await navigator.clipboard.writeText(ip);
      toast.success("IP copiée dans le presse-papiers");
    } catch {
      toast.error("Copie impossible (navigateur ou permissions)");
    }
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          title="Cliquer pour afficher l’IP et la copier"
          className={cn(
            "text-emerald-600 hover:text-emerald-700 dark:text-emerald-500 dark:hover:text-emerald-400",
            "inline-flex size-8 items-center justify-center rounded-md transition-colors",
            "hover:bg-emerald-500/10 focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]",
          )}
          aria-label={`IP fixe : afficher et copier (${ip})`}
        >
          <CheckCircle2 className="size-5" strokeWidth={2} aria-hidden />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="top"
          align="center"
          sideOffset={6}
          className={cn(
            "border-border bg-popover text-popover-foreground z-50 w-[min(calc(100vw-2rem),18rem)] rounded-lg border p-3 shadow-md outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          )}
        >
          <p className="text-muted-foreground mb-2 text-xs font-medium">IP fixe</p>
          <div className="flex items-stretch gap-2">
            <code className="bg-muted text-foreground max-h-24 min-w-0 flex-1 overflow-auto rounded-md px-2 py-1.5 font-mono text-xs break-all">
              {ip}
            </code>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="shrink-0 self-start"
              onClick={() => void copy()}
            >
              <Copy className="mr-1 size-3.5" aria-hidden />
              Copier
            </Button>
          </div>
          <Popover.Close asChild>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground mt-3 w-full text-center text-xs underline-offset-2 hover:underline"
            >
              Fermer
            </button>
          </Popover.Close>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
