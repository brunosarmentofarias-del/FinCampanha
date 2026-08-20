"use client";

import { useRouter } from "next/navigation";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatMesLabel } from "@/lib/format";
import type { FluxoMes } from "@/lib/calc";

export function FluxoAreaChart({ meses }: { meses: FluxoMes[] }) {
  const router = useRouter();
  const dados = meses.map((m) => ({
    mes: formatMesLabel(m.mes),
    Total: Number(m.total.toFixed(2)),
    Acumulado: Number(m.acumulado.toFixed(2)),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-baseline gap-2 text-sm">
          Fluxo a Pagar por Mês
          <span className="text-xs font-normal text-muted-foreground">(A Pagar)</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {dados.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Nada pendente.</p>
        ) : (
          <>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={dados}
                  margin={{ left: 8, right: 16 }}
                  onClick={() => router.push("/fluxo")}
                  className="cursor-pointer"
                >
                  <defs>
                    <linearGradient id="fluxoTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="mes" fontSize={12} />
                  <YAxis tickFormatter={(v) => formatCurrency(v)} fontSize={11} width={90} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="Total" stroke="#2563eb" fill="url(#fluxoTotal)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-1 text-center text-xs text-muted-foreground">
              Clique no gráfico para ver o detalhamento por fornecedor em Fluxo de Caixa.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
