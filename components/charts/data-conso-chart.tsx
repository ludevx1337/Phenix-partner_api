"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ConsoPoint = { date: string; volume: number };

export function DataConsoChart({ data }: { data: ConsoPoint[] }) {
  if (!data.length) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        Pas encore de données de recharges pour le graphique.
      </p>
    );
  }
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
          />
          <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--popover))",
            }}
            labelStyle={{ color: "hsl(var(--popover-foreground))" }}
          />
          <Bar
            dataKey="volume"
            name="Recharges (nb)"
            fill="hsl(var(--chart-2))"
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
