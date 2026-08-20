"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/format";
import type { DespesaPorGrupo } from "@/lib/calc";

const CORES_FALLBACK = ["#2563eb", "#9333ea", "#f59e0b", "#0891b2", "#16a34a", "#64748b", "#dc2626"];

export function DonutGrupos({ rows }: { rows: DespesaPorGrupo[] }) {
  const dados = rows
    .filter((r) => r.total > 0)
    .map((r, i) => ({ ...r, cor: r.cor ?? CORES_FALLBACK[i % CORES_FALLBACK.length] }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Despesas por Grupo</CardTitle>
      </CardHeader>
      <CardContent>
        {dados.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Sem despesas lançadas.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 sm:items-center">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dados}
                    dataKey="total"
                    nameKey="grupoNome"
                    innerRadius="55%"
                    outerRadius="90%"
                    paddingAngle={2}
                  >
                    {dados.map((d) => (
                      <Cell key={d.grupoId} fill={d.cor} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-1.5 text-sm">
              {dados
                .sort((a, b) => b.total - a.total)
                .map((d) => (
                  <li key={d.grupoId} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 truncate">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: d.cor }}
                      />
                      <span className="truncate">{d.grupoNome}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {formatCurrency(d.total)} · {formatPercent(d.percentualDoTotal)}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
