import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { getRelatorioData } from "@/lib/data/relatorio-data";
import { formatMesLabel } from "@/lib/format";

const MOEDA = '#,##0.00" "';

export async function GET() {
  const data = await getRelatorioData();
  const wb = new ExcelJS.Workbook();
  wb.creator = "FinCampanha";
  wb.created = new Date();

  // Resumo Executivo
  const resumoSheet = wb.addWorksheet("Resumo Executivo");
  resumoSheet.columns = [
    { header: "Indicador", key: "indicador", width: 28 },
    { header: "Valor", key: "valor", width: 20 },
  ];
  const linhasResumo: [string, number][] = [
    ["Receita Contratada", data.resumo.receitaContratada],
    ["Receita Recebida", data.resumo.receitaRecebida],
    ["Receita A Receber", data.resumo.receitaAReceber],
    ["Despesa Total", data.resumo.despesaTotal],
    ["Despesa Paga", data.resumo.despesaPaga],
    ["Despesa A Pagar", data.resumo.despesaAPagar],
    ["Resultado Projetado", data.resumo.resultadoProjetado],
    ["Caixa Realizado", data.resumo.caixaRealizado],
  ];
  for (const [indicador, valor] of linhasResumo) {
    resumoSheet.addRow({ indicador, valor });
  }
  resumoSheet.addRow({ indicador: "Margem Projetada", valor: data.resumo.margemProjetada });
  resumoSheet.getColumn("valor").numFmt = MOEDA;
  resumoSheet.getRow(1).font = { bold: true };
  resumoSheet.getCell(`B${linhasResumo.length + 2}`).numFmt = "0.0%";

  // Despesas por Grupo
  const grupoSheet = wb.addWorksheet("Despesas por Grupo");
  grupoSheet.columns = [
    { header: "Grupo", key: "grupo", width: 30 },
    { header: "Pago", key: "pago", width: 16 },
    { header: "A Pagar", key: "aPagar", width: 16 },
    { header: "Total", key: "total", width: 16 },
    { header: "% do Total", key: "percentual", width: 14 },
  ];
  for (const g of data.despesasPorGrupo) {
    grupoSheet.addRow({
      grupo: g.grupoNome,
      pago: g.pago,
      aPagar: g.aPagar,
      total: g.total,
      percentual: g.percentualDoTotal,
    });
  }
  grupoSheet.getColumn("pago").numFmt = MOEDA;
  grupoSheet.getColumn("aPagar").numFmt = MOEDA;
  grupoSheet.getColumn("total").numFmt = MOEDA;
  grupoSheet.getColumn("percentual").numFmt = "0.0%";
  grupoSheet.getRow(1).font = { bold: true };

  // Por Cliente
  const clienteSheet = wb.addWorksheet("Por Cliente");
  clienteSheet.columns = [
    { header: "Cliente", key: "cliente", width: 24 },
    { header: "Recebido", key: "recebido", width: 16 },
    { header: "A Receber", key: "aReceber", width: 16 },
    { header: "Contrato Total", key: "contrato", width: 16 },
    { header: "% do Total", key: "percentual", width: 14 },
  ];
  for (const c of data.receitaPorCliente) {
    clienteSheet.addRow({
      cliente: c.clienteNome,
      recebido: c.recebido,
      aReceber: c.aReceber,
      contrato: c.contratoTotal,
      percentual: c.percentualDoTotal,
    });
  }
  clienteSheet.getColumn("recebido").numFmt = MOEDA;
  clienteSheet.getColumn("aReceber").numFmt = MOEDA;
  clienteSheet.getColumn("contrato").numFmt = MOEDA;
  clienteSheet.getColumn("percentual").numFmt = "0.0%";
  clienteSheet.getRow(1).font = { bold: true };

  // Resultado por Campanha
  const campanhaSheet = wb.addWorksheet("Resultado por Campanha");
  campanhaSheet.columns = [
    { header: "Campanha", key: "campanha", width: 24 },
    { header: "Receita", key: "receita", width: 16 },
    { header: "Despesa Específica", key: "despesaEspecifica", width: 18 },
    { header: "Rateio (Todas)", key: "rateio", width: 16 },
    { header: "Resultado", key: "resultado", width: 16 },
  ];
  for (const l of data.resultadoPorCampanha) {
    campanhaSheet.addRow({
      campanha: l.clienteNome,
      receita: l.receita,
      despesaEspecifica: l.despesaEspecifica,
      rateio: l.rateioTodas,
      resultado: l.resultado,
    });
  }
  ["receita", "despesaEspecifica", "rateio", "resultado"].forEach((k) => {
    campanhaSheet.getColumn(k).numFmt = MOEDA;
  });
  campanhaSheet.getRow(1).font = { bold: true };

  // Fluxo a Pagar por Mês
  const fluxoSheet = wb.addWorksheet("Fluxo a Pagar por Mês");
  fluxoSheet.columns = [
    { header: "Mês", key: "mes", width: 12 },
    { header: "Fornecedor", key: "fornecedor", width: 28 },
    { header: "Valor", key: "valor", width: 16 },
  ];
  for (const m of data.fluxoPagar) {
    for (const item of m.itens) {
      fluxoSheet.addRow({ mes: formatMesLabel(m.mes), fornecedor: item.chave, valor: item.valor });
    }
    fluxoSheet.addRow({ mes: formatMesLabel(m.mes), fornecedor: "TOTAL DO MÊS", valor: m.total }).font = {
      bold: true,
    };
  }
  fluxoSheet.getColumn("valor").numFmt = MOEDA;
  fluxoSheet.getRow(1).font = { bold: true };

  // Receitas (bruto)
  const receitasSheet = wb.addWorksheet("Receitas");
  receitasSheet.columns = [
    { header: "Cliente", key: "cliente", width: 16 },
    { header: "Descrição", key: "descricao", width: 30 },
    { header: "Vencimento", key: "vencimento", width: 14 },
    { header: "Data Pagto", key: "dataPagamento", width: 14 },
    { header: "Valor", key: "valor", width: 16 },
    { header: "Status", key: "status", width: 14 },
  ];
  for (const r of data.receitas) {
    receitasSheet.addRow({
      cliente: r.clienteNome,
      descricao: r.descricao,
      vencimento: r.vencimento,
      dataPagamento: r.dataPagamento ?? "",
      valor: r.valor,
      status: r.status === "RECEBIDO" ? "Recebido" : "A Receber",
    });
  }
  receitasSheet.getColumn("valor").numFmt = MOEDA;
  receitasSheet.getColumn("vencimento").numFmt = "dd/mm/yyyy";
  receitasSheet.getColumn("dataPagamento").numFmt = "dd/mm/yyyy";
  receitasSheet.getRow(1).font = { bold: true };

  // Despesas (bruto)
  const despesasSheet = wb.addWorksheet("Despesas");
  despesasSheet.columns = [
    { header: "Fornecedor", key: "fornecedor", width: 24 },
    { header: "Grupo", key: "grupo", width: 22 },
    { header: "Descrição", key: "descricao", width: 30 },
    { header: "Vencimento", key: "vencimento", width: 14 },
    { header: "Campanha", key: "campanha", width: 16 },
    { header: "Status", key: "status", width: 12 },
    { header: "Valor", key: "valor", width: 16 },
  ];
  for (const d of data.despesas) {
    despesasSheet.addRow({
      fornecedor: d.fornecedorNome,
      grupo: d.grupoNome,
      descricao: d.descricao,
      vencimento: d.vencimento,
      campanha: d.rateio === "TODAS" ? "TODAS" : d.rateio === "NAO_ALOCADA" ? "" : d.clienteNome,
      status: d.status === "PAGO" ? "Pago" : "A Pagar",
      valor: d.valor,
    });
  }
  despesasSheet.getColumn("valor").numFmt = MOEDA;
  despesasSheet.getColumn("vencimento").numFmt = "dd/mm/yyyy";
  despesasSheet.getRow(1).font = { bold: true };

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="fincampanha-relatorio-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx"`,
    },
  });
}
