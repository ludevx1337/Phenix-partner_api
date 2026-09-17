"use client";

import {
  type Column,
  type ColumnDef,
  type PaginationState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { GsmLine } from "@/types/database";
import { IpFixeCell } from "@/components/lignes/ip-fixe-cell";
import { OperatorMark } from "@/components/lignes/operator-mark";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  MoreHorizontal,
} from "lucide-react";
import { useRouter } from "next/navigation";

type Props = {
  lines: GsmLine[];
};

async function postLine(url: string, body: object) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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
    throw new Error(msg);
  }
  return json;
}

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

function isLigneResilie(line: GsmLine): boolean {
  const e = (line.etat ?? "").toLowerCase();
  return e.includes("résil") || e.includes("resil");
}

function SortableColumnHeader({
  column,
  label,
}: {
  column: Column<GsmLine, unknown>;
  label: string;
}) {
  if (!column.getCanSort()) {
    return <span className="px-2">{label}</span>;
  }
  const sorted = column.getIsSorted();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-2 h-8 gap-1 px-2 font-medium data-[active]:bg-transparent"
      onClick={column.getToggleSortingHandler()}
      aria-sort={
        sorted === "asc"
          ? "ascending"
          : sorted === "desc"
            ? "descending"
            : "none"
      }
    >
      {label}
      {sorted === "desc" ? (
        <ArrowDown className="size-4 shrink-0 opacity-80" aria-hidden />
      ) : sorted === "asc" ? (
        <ArrowUp className="size-4 shrink-0 opacity-80" aria-hidden />
      ) : (
        <ChevronsUpDown
          className="text-muted-foreground size-4 shrink-0"
          aria-hidden
        />
      )}
    </Button>
  );
}

function toNumber(value: number | string | null | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatGo(value: number | string | null | undefined): string {
  const n = toNumber(value);
  if (n === null) return "—";
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
  }).format(n);
}

function RechargeCell({ line }: { line: GsmLine }) {
  const snapshot = line.latest_sdtr;
  const rechargeValue = toNumber(snapshot?.recharge_value_go);
  const rechargeLabel = snapshot?.recharge_label?.trim();

  if (!snapshot || (rechargeValue === null && !rechargeLabel)) {
    return <span className="text-muted-foreground">—</span>;
  }

  const label = rechargeLabel ?? `${formatGo(rechargeValue)} Go`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          className="inline-flex items-center rounded-full bg-sky-100 px-2 py-1 text-xs font-medium whitespace-nowrap text-sky-700 dark:bg-sky-950/40 dark:text-sky-300"
          aria-label={`Recharge DATA ${label}`}
        >
          +{label}
        </TooltipTrigger>
        <TooltipContent>
          Recharge détectée sur le dernier relevé SDTR
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function DataUsageCell({ line }: { line: GsmLine }) {
  const snapshot = line.latest_sdtr;
  const percent = toNumber(snapshot?.usage_percent);

  if (percent === null || !snapshot) {
    return <span className="text-muted-foreground">—</span>;
  }

  const roundedPercent = Math.round(percent);
  const tone =
    percent >= 90
      ? "bg-destructive/10 text-destructive"
      : percent >= 75
        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          className={cn(
            "inline-flex min-w-16 items-center justify-center rounded-full px-2 py-1 text-xs font-medium tabular-nums",
            tone,
          )}
          aria-label={`DATA utilisée ${roundedPercent}%`}
        >
          {roundedPercent}%
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p>
              {formatGo(snapshot.used_value_go)} /{" "}
              {formatGo(snapshot.total_value_go)} Go utilisés
            </p>
            {snapshot.recharge_label || snapshot.recharge_value_go ? (
              <p>
                Recharge :{" "}
                {snapshot.recharge_label ??
                  `${formatGo(snapshot.recharge_value_go)} Go`}
              </p>
            ) : null}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function LinesTable({ lines }: Props) {
  const router = useRouter();
  const [globalFilter, setGlobalFilter] = useState("");
  const [operateurFilter, setOperateurFilter] = useState<string>("all");
  const [etatFilter, setEtatFilter] = useState<string>("all");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const [sorting, setSorting] = useState<SortingState>([]);

  const operateurs = useMemo(() => {
    const s = new Set<string>();
    lines.forEach((l) => {
      if (l.operateur) s.add(l.operateur);
    });
    return Array.from(s).sort();
  }, [lines]);

  const filtered = useMemo(() => {
    const q = globalFilter.trim().toLowerCase();
    return lines.filter((l) => {
      if (q) {
        const hay = [
          l.msisdn,
          l.nom_client,
          l.forfait_gsm_code,
          l.code_tarif_achat,
          l.ip_fixe,
          l.code_client,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (operateurFilter !== "all" && l.operateur !== operateurFilter) {
        return false;
      }
      if (etatFilter !== "all") {
        const e = (l.etat ?? "").toLowerCase();
        if (etatFilter === "active" && !e.includes("act")) return false;
        if (etatFilter === "suspend" && !e.includes("susp")) return false;
        if (
          etatFilter === "resilie" &&
          !e.includes("résil") &&
          !e.includes("resil")
        )
          return false;
      }
      return true;
    });
  }, [lines, globalFilter, operateurFilter, etatFilter]);

  useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [globalFilter, operateurFilter, etatFilter, sorting]);

  const columns = useMemo<ColumnDef<GsmLine>[]>(
    () => [
      {
        accessorKey: "msisdn",
        sortingFn: "alphanumeric",
        header: ({ column }) => (
          <SortableColumnHeader column={column} label="MSISDN" />
        ),
      },
      {
        accessorKey: "nom_client",
        sortingFn: "alphanumeric",
        header: ({ column }) => (
          <SortableColumnHeader column={column} label="Client" />
        ),
        cell: ({ getValue }) => (getValue() as string | null) ?? "—",
      },
      {
        accessorKey: "forfait_gsm_code",
        sortingFn: "alphanumeric",
        header: ({ column }) => (
          <SortableColumnHeader column={column} label="Forfait" />
        ),
        cell: ({ getValue }) => (getValue() as string | null) ?? "—",
      },
      {
        accessorKey: "code_tarif_achat",
        sortingFn: "alphanumeric",
        header: ({ column }) => (
          <SortableColumnHeader column={column} label="Tarif achat" />
        ),
        cell: ({ getValue }) => (getValue() as string | null) ?? "—",
      },
      {
        accessorKey: "ip_fixe",
        sortingFn: "alphanumeric",
        header: ({ column }) => (
          <SortableColumnHeader column={column} label="IP fixe" />
        ),
        cell: ({ row }) => <IpFixeCell value={row.original.ip_fixe} />,
      },
      {
        accessorKey: "operateur",
        sortingFn: "alphanumeric",
        header: ({ column }) => (
          <SortableColumnHeader column={column} label="Opérateur" />
        ),
        cell: ({ row }) => <OperatorMark operateur={row.original.operateur} />,
      },
      {
        accessorKey: "etat",
        sortingFn: "alphanumeric",
        header: ({ column }) => (
          <SortableColumnHeader column={column} label="État" />
        ),
      },
      {
        id: "data_usage",
        accessorFn: (line) => toNumber(line.latest_sdtr?.usage_percent) ?? -1,
        sortingFn: "basic",
        header: ({ column }) => (
          <SortableColumnHeader column={column} label="DATA" />
        ),
        cell: ({ row }) => <DataUsageCell line={row.original} />,
      },
      {
        id: "data_recharge",
        accessorFn: (line) =>
          toNumber(line.latest_sdtr?.recharge_value_go) ?? 0,
        sortingFn: "basic",
        header: ({ column }) => (
          <SortableColumnHeader column={column} label="Recharge" />
        ),
        cell: ({ row }) => <RechargeCell line={row.original} />,
      },
      {
        accessorKey: "code_client",
        sortingFn: "alphanumeric",
        header: ({ column }) => (
          <SortableColumnHeader column={column} label="Code client" />
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        header: "",
        cell: ({ row }) => {
          const line = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon" }),
                )}
                aria-label="Actions ligne"
              >
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() =>
                    router.push(`/lignes/${encodeURIComponent(line.msisdn)}`)
                  }
                >
                  Consulter
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    void (async () => {
                      try {
                        await postLine("/api/phenix/lines/suspend", {
                          msisdn: line.msisdn,
                        });
                        toast.success("Suspension demandée");
                        router.refresh();
                      } catch (e) {
                        toast.error(
                          e instanceof Error ? e.message : "Erreur suspension",
                        );
                      }
                    })();
                  }}
                >
                  Suspendre
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    void (async () => {
                      try {
                        await postLine("/api/phenix/lines/resume", {
                          msisdn: line.msisdn,
                        });
                        toast.success("Réactivation demandée");
                        router.refresh();
                      } catch (e) {
                        toast.error(
                          e instanceof Error
                            ? e.message
                            : "Erreur réactivation",
                        );
                      }
                    })();
                  }}
                >
                  Réactiver
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [router],
  );

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    state: { globalFilter, pagination, sorting },
    onGlobalFilterChange: setGlobalFilter,
  });

  const { pageIndex, pageSize } = table.getState().pagination;
  const totalFiltered = filtered.length;
  const from = totalFiltered === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, totalFiltered);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            placeholder="Recherche MSISDN, client, forfait…"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="max-w-xs sm:max-w-md"
            aria-label="Filtrer les lignes"
          />
          <Select
            value={operateurFilter}
            onValueChange={(v) => setOperateurFilter(v ?? "all")}
          >
            <SelectTrigger className="w-full sm:w-44" aria-label="Opérateur">
              <SelectValue placeholder="Opérateur" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous opérateurs</SelectItem>
              {operateurs.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={etatFilter}
            onValueChange={(v) => setEtatFilter(v ?? "all")}
          >
            <SelectTrigger className="w-full sm:w-44" aria-label="État">
              <SelectValue placeholder="État" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous états</SelectItem>
              <SelectItem value="active">Actif</SelectItem>
              <SelectItem value="suspend">Suspendu</SelectItem>
              <SelectItem value="resilie">Résilié</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id}>
                    {h.isPlaceholder
                      ? null
                      : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    isLigneResilie(row.original) &&
                      "bg-muted/50 text-muted-foreground hover:bg-muted/60",
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-muted-foreground h-24 text-center"
                >
                  Aucune ligne. Synchronisez depuis PHENIX.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="bg-muted/30 flex flex-col gap-3 border-t px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-sm tabular-nums">
            {totalFiltered === 0
              ? "Aucun résultat"
              : `Affichage ${from}–${to} sur ${totalFiltered}`}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm whitespace-nowrap">
                Lignes par page
              </span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  const n = Number(v);
                  if (
                    PAGE_SIZE_OPTIONS.includes(
                      n as (typeof PAGE_SIZE_OPTIONS)[number],
                    )
                  ) {
                    table.setPageSize(n);
                  }
                }}
              >
                <SelectTrigger
                  className="w-[4.5rem]"
                  aria-label="Nombre de lignes par page"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                aria-label="Page précédente"
              >
                <ChevronLeft className="size-4" />
                Précédent
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                aria-label="Page suivante"
              >
                Suivant
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
