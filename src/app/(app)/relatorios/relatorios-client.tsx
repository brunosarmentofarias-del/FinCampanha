"use client";

import { useState } from "react";
import { FileDown, FileSpreadsheet } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatMesLabel, formatPercent } from "@/lib/format";
import type {
  DespesaPorGrupo,
  FluxoMes,
  ReceitaPorCliente,
  ResultadoCampanha,
  ResumoExecutivo,
} from "@/lib/calc";

interface Props {
  resumo: ResumoExecutivo;
  despesasPorGrupo: DespesaPorGrupo[];
  receitaPorCliente: ReceitaPorCliente[];
  resultadoPorCampanha: ResultadoCampanha[];
  fluxoPagar: FluxoMes[];
}

export function RelatoriosClient({
  resumo,
  despesasPorGrupo,
  receitaPorCliente,
  resultadoPorCampanha,
  fluxoPagar,
}: Props) {
  const [gerandoPdf, setGerandoPdf] = useState(false);

  function gerarPdf() {
    setGerandoPdf(true);
    try {
      const doc = new jsPDF();
      const hoje = new Date().toLocaleDateString("pt-BR");

      doc.setFontSize(16);
      doc.text("FinCampanha — Resumo Executivo", 14, 16);
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(`Gerado em ${hoje}`, 14, 22);
      doc.setTextColor(0);

      autoTable(doc, {
        startY: 28,
        head: [["Indicador", "Valor"]],
        body: [
          ["Receita Contratada", formatCurrency(resumo.receitaContratada)],
          ["Receita Recebida", formatCurrency(resumo.receitaRecebida)],
          ["Receita A Receber", formatCurrency(resumo.receitaAReceber)],
          ["Despesa Total", formatCurrency(resumo.despesaTotal)],
          ["Despesa Paga", formatCurrency(resumo.despesaPaga)],
          ["Despesa A Pagar", formatCurrency(resumo.despesaAPagar)],
          ["Resultado Projetado", formatCurrency(resumo.resultadoProjetado)],
          ["Margem Projetada", formatPercent(resumo.margemProjetada)],
          ["Caixa Realizado", formatCurrency(resumo.caixaRealizado)],
        ],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [37, 99, 235] },
      });

      let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.text("Despesas por Grupo", 14, y);
      autoTable(doc, {
        startY: y + 4,
        head: [["Grupo", "Pago", "A Pagar", "Total", "%"]],
        body: despesasPorGrupo.map((g) => [
          g.grupoNome,
          formatCurrency(g.pago),
          formatCurrency(g.aPagar),
          formatCurrency(g.total),
          formatPercent(g.percentualDoTotal),
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [37, 99, 235] },
      });

      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.text("Resultado por Campanha", 14, y);
      autoTable(doc, {
        startY: y + 4,
        head: [["Campanha", "Receita", "Desp. Específica", "Rateio", "Resultado"]],
        body: resultadoPorCampanha.map((l) => [
          l.clienteNome,
          formatCurrency(l.receita),
          formatCurrency(l.despesaEspecifica),
          formatCurrency(l.rateioTodas),
          formatCurrency(l.resultado),
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [37, 99, 235] },
      });

      if (fluxoPagar.length > 0) {
        doc.addPage();
        doc.setFontSize(12);
        doc.text("Fluxo a Pagar por Mês", 14, 16);
        autoTable(doc, {
          startY: 20,
          head: [["Mês", "Total do Mês", "Acumulado"]],
          body: fluxoPagar.map((m) => [
            formatMesLabel(m.mes),
            formatCurrency(m.total),
            formatCurrency(m.acumulado),
          ]),
          styles: { fontSize: 9 },
          headStyles: { fillColor: [37, 99, 235] },
        });

        doc.setFontSize(12);
        let y2 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
        doc.text("Por Cliente", 14, y2);
        autoTable(doc, {
          startY: y2 + 4,
          head: [["Cliente", "Recebido", "A Receber", "Contrato"]],
          body: receitaPorCliente.map((c) => [
            c.clienteNome,
            formatCurrency(c.recebido),
            formatCurrency(c.aReceber),
            formatCurrency(c.contratoTotal),
          ]),
          styles: { fontSize: 9 },
          headStyles: { fillColor: [37, 99, 235] },
        });
      }

      doc.save(`fincampanha-resumo-${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setGerandoPdf(false);
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="h-5 w-5" /> Planilha completa (XLSX)
          </CardTitle>
          <CardDescription>
            Resumo Executivo, Despesas por Grupo, Por Cliente, Resultado por Campanha, Fluxo a
            Pagar por Mês e os lançamentos brutos — no mesmo formato da planilha original.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<a href="/api/relatorios/xlsx" download />} nativeButton={false}>
            <FileDown className="mr-1 h-4 w-4" /> Baixar XLSX
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileDown className="h-5 w-5" /> Resumo executivo (PDF)
          </CardTitle>
          <CardDescription>
            Uma versão enxuta para compartilhar com o cliente: KPIs, grupos, campanhas e fluxo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={gerarPdf} disabled={gerandoPdf}>
            <FileDown className="mr-1 h-4 w-4" /> {gerandoPdf ? "Gerando..." : "Baixar PDF"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
