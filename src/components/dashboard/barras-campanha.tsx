"use client";

import { Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatCurrencyCompacta } from "@/lib/format";
import type { ResultadoCampanha } from "@/lib/calc";

const COR_RECEITA = "#2563eb";
const COR_DESPESA = "#dc2626";
const COR_RATEIO = "#7dd3fc";
const COR_RESULTADO = "#16a34a";

function YAxisTick({
  x,
  y,
  payload,
}: {
  x?: string | number;
  y?: string | number;
  payload: { value: string };
}) {
  const naoAlocado = payload.value.toLowerCase().startsWith("não aloc");
  return (
    <text
      x={x}
      y={y}
      dy={4}
      textAnchor="end"
      fontSize={12}
      fill={naoAlocado ? "#dc2626" : "currentColor"}
      fontWeight={naoAlocado ? 600 : 400}
      className={naoAlocado ? "" : "fill-foreground"}
    >
      {payload.value}
    </text>
  );
}

export function BarrasCampanha({ linhas }: { linhas: ResultadoCampanha[] }) {
  const dados = linhas.map((l) => ({
    nome: l.clienteNome,
    Receita: Number(l.receita.toFixed(2)),
    "Despesa Específica": Number((-l.despesaEspecifica).toFixed(2)),
    "Rateio (Todas)": Number((-l.rateioTodas).toFixed(2)),
    Resultado: Number(l.resultado.toFixed(2)),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Resultado por Campanha</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height: Math.max(240, dados.length * 56) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dados} layout="vertical" margin={{ left: 44, right: 44, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} fontSize={11} />
              <YAxis
                type="category"
                dataKey="nome"
                width={100}
                tick={(props) => <YAxisTick {...props} />}
              />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} contentStyle={{ fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Receita" fill={COR_RECEITA} radius={[0, 4, 4, 0]}>
                <LabelList
                  dataKey="Receita"
                  position="right"
                  fontSize={10}
                  fill="currentColor"
                  className="fill-muted-foreground"
                  formatter={(v) => (typeof v === "number" && v ? formatCurrencyCompacta(v) : "")}
                />
              </Bar>
              <Bar dataKey="Despesa Específica" fill={COR_DESPESA} radius={[0, 4, 4, 0]}>
                <LabelList
                  dataKey="Despesa Específica"
                  position="left"
                  fontSize={10}
                  fill="currentColor"
                  className="fill-muted-foreground"
                  formatter={(v) => (typeof v === "number" && v ? formatCurrencyCompacta(v) : "")}
                />
              </Bar>
              <Bar dataKey="Rateio (Todas)" fill={COR_RATEIO} radius={[0, 4, 4, 0]}>
                <LabelList
                  dataKey="Rateio (Todas)"
                  position="left"
                  fontSize={10}
                  fill="currentColor"
                  className="fill-muted-foreground"
                  formatter={(v) => (typeof v === "number" && v ? formatCurrencyCompacta(v) : "")}
                />
              </Bar>
              <Bar dataKey="Resultado" fill={COR_RESULTADO} radius={[0, 4, 4, 0]}>
                <LabelList
                  dataKey="Resultado"
                  position="right"
                  fontSize={10}
                  fill="currentColor"
                  className="fill-muted-foreground"
                  formatter={(v) => (typeof v === "number" && v ? formatCurrencyCompacta(v) : "")}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
