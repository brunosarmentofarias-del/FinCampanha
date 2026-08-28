"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatMesLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FluxoMes } from "@/lib/calc";

function exportarCsv(meses: FluxoMes[], nomeArquivo: string, colunaChave: string) {
  const linhas = [["Mês", colunaChave, "Valor"]];
  for (const m of meses) {
    for (const item of m.itens) {
      linhas.push([formatMesLabel(m.mes), item.chave, item.valor.toFixed(2)]);
    }
  }
  const csv = linhas.map((l) => l.map((c) => `"${c.replace(/"/g, '""')}"`).join(";")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
}

function totalGeralPorChave(meses: FluxoMes[]): { chave: string; valor: number }[] {
  const totais = new Map<string, number>();
  for (const m of meses) {
    for (const item of m.itens) {
      totais.set(item.chave, (totais.get(item.chave) ?? 0) + item.valor);
    }
  }
  return Array.from(totais.entries())
    .map(([chave, valor]) => ({ chave, valor }))
    .sort((a, b) => b.valor - a.valor);
}

function ResumoPorChave({ meses, colunaChave }: { meses: FluxoMes[]; colunaChave: string }) {
  const totais = totalGeralPorChave(meses);
  const totalGeral = soma(totais.map((t) => t.valor));

  if (totais.length === 0) return null;

  return (
    <Card>
      <CardContent className="pt-4">
        <p className="mb-2 text-sm font-medium">Total geral por {colunaChave.toLowerCase()} (todos os meses)</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="pb-1 font-normal">{colunaChave}</th>
              <th className="pb-1 text-right font-normal">Total</th>
            </tr>
          </thead>
          <tbody>
            {totais.map((t) => (
              <tr key={t.chave}>
                <td className="py-0.5">{t.chave}</td>
                <td className="py-0.5 text-right tabular-nums">{formatCurrency(t.valor)}</td>
              </tr>
            ))}
            <tr className="border-t font-semibold">
              <td className="py-1">Total</td>
              <td className="py-1 text-right tabular-nums">{formatCurrency(totalGeral)}</td>
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function soma(valores: number[]): number {
  return valores.reduce((acc, v) => acc + v, 0);
}

function FluxoList({ meses, colunaChave, nomeArquivo }: { meses: FluxoMes[]; colunaChave: string; nomeArquivo: string }) {
  const [abertos, setAbertos] = useState<Set<string>>(new Set());

  function alternar(mes: string) {
    setAbertos((prev) => {
      const next = new Set(prev);
      if (next.has(mes)) next.delete(mes);
      else next.add(mes);
      return next;
    });
  }

  if (meses.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Nada pendente.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => exportarCsv(meses, nomeArquivo, colunaChave)}>
          <Download className="mr-1 h-4 w-4" /> Exportar CSV
        </Button>
      </div>
      <ResumoPorChave meses={meses} colunaChave={colunaChave} />
      <div className="space-y-2">
        {meses.map((m) => {
          const aberto = abertos.has(m.mes);
          return (
            <Card key={m.mes}>
              <button
                className="flex w-full items-center justify-between p-4 text-left"
                onClick={() => alternar(m.mes)}
              >
                <span className="flex items-center gap-2 font-medium">
                  {aberto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  {formatMesLabel(m.mes)}
                </span>
                <span className="flex gap-6 text-sm tabular-nums">
                  <span className="text-muted-foreground">
                    Acumulado: <span className="font-medium text-foreground">{formatCurrency(m.acumulado)}</span>
                  </span>
                  <span className="font-semibold">{formatCurrency(m.total)}</span>
                </span>
              </button>
              {aberto && (
                <CardContent className={cn("border-t pt-3")}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="pb-1 font-normal">{colunaChave}</th>
                        <th className="pb-1 text-right font-normal">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {m.itens.map((item) => (
                        <tr key={item.chave}>
                          <td className="py-0.5">{item.chave}</td>
                          <td className="py-0.5 text-right tabular-nums">{formatCurrency(item.valor)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function FluxoPagarComAgrupamento({
  fluxoPagar,
  fluxoPagarPorCliente,
}: {
  fluxoPagar: FluxoMes[];
  fluxoPagarPorCliente: FluxoMes[];
}) {
  const [agrupamento, setAgrupamento] = useState<"fornecedor" | "cliente">("fornecedor");

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button
          variant={agrupamento === "fornecedor" ? "default" : "outline"}
          size="sm"
          onClick={() => setAgrupamento("fornecedor")}
        >
          Por Fornecedor
        </Button>
        <Button
          variant={agrupamento === "cliente" ? "default" : "outline"}
          size="sm"
          onClick={() => setAgrupamento("cliente")}
        >
          Por Cliente
        </Button>
      </div>
      {agrupamento === "fornecedor" ? (
        <FluxoList meses={fluxoPagar} colunaChave="Fornecedor" nomeArquivo="fluxo-a-pagar-fornecedor.csv" />
      ) : (
        <FluxoList meses={fluxoPagarPorCliente} colunaChave="Cliente" nomeArquivo="fluxo-a-pagar-cliente.csv" />
      )}
    </div>
  );
}

export function FluxoTabs({
  fluxoPagar,
  fluxoPagarPorCliente,
  fluxoReceber,
}: {
  fluxoPagar: FluxoMes[];
  fluxoPagarPorCliente: FluxoMes[];
  fluxoReceber: FluxoMes[];
}) {
  return (
    <Tabs defaultValue="pagar">
      <TabsList>
        <TabsTrigger value="pagar">A Pagar</TabsTrigger>
        <TabsTrigger value="receber">A Receber</TabsTrigger>
      </TabsList>
      <TabsContent value="pagar" className="pt-4">
        <FluxoPagarComAgrupamento fluxoPagar={fluxoPagar} fluxoPagarPorCliente={fluxoPagarPorCliente} />
      </TabsContent>
      <TabsContent value="receber" className="pt-4">
        <FluxoList meses={fluxoReceber} colunaChave="Cliente" nomeArquivo="fluxo-a-receber.csv" />
      </TabsContent>
    </Tabs>
  );
}
