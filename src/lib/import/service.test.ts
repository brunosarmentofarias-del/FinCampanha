import type { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseWorkbook } from "./excel";
import { confirmarImportacao, gerarRelatorioImportacao } from "./service";
import { criarClienteTeste, limparBancoTeste, prepararSchemaTeste } from "../test-db";

function buildWorkbook(): Buffer {
  const wb = XLSX.utils.book_new();
  const receitasRows = [
    ["Relatório de campanha"],
    [],
    [],
    ["Cliente", "Descrição", "Vencimento", "Data Pagto", "Valor", "Status"],
    ["ELEICOES 2026 - PLINIO VALERIO", "CAMPANHA 2026 - 1/2", "10/01/2026", "10/01/2026", 50000, "Recebido"],
    ["ELEICOES 2026 - PLINIO VALERIO", "CAMPANHA 2026 - 2/2", "10/03/2026", "—", 50000, "A Receber"],
    ["PARTIDO NOVO", "Cota partidária", "01/01/2026", "01/01/2026", 40000, "Recebido"],
    ["", "TOTAL RECEITAS", "", "", 140000, ""],
  ];
  const despesasRows = [
    ["Relatório de campanha"],
    [],
    [],
    ["Fornecedor", "Grupo", "Descrição", "Data/Venc.", "Campanha", "Status", "Valor"],
    ["Gráfica ABC", "Gráfica", "Panfletos", "05/02/2026", "PLINIO", "Pago", -500],
    ["  gráfica abc  ", "Gráfica", "Panfletos 2", "06/02/2026", "PLINIO", "A Pagar", -300],
    ["Marketing XYZ", "Marketing", "Ads", "10/02/2026", "TODAS", "A Pagar", -2000],
    ["Buffet Silva", "Alimentação", "Coffee break", "12/02/2026", "", "A Pagar", -300],
    ["", "", "TOTAL DESPESAS", "", "", "", -3100],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(receitasRows), "Receitas");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(despesasRows), "Despesas");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

describe("confirmarImportacao (integração com Postgres/Neon)", () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prepararSchemaTeste();
    prisma = criarClienteTeste();
    await limparBancoTeste(prisma);
  });

  afterAll(async () => {
    await limparBancoTeste(prisma);
    await prisma?.$disconnect();
  });

  it("importa, faz upsert por nome case-insensitive e classifica o rateio", async () => {
    const parsed = parseWorkbook(buildWorkbook());
    expect(parsed.erros).toHaveLength(0);

    const relatorio = await gerarRelatorioImportacao(parsed, prisma);
    expect(relatorio.receitas.total).toBe(3);
    expect(relatorio.despesas.total).toBe(4);
    expect(relatorio.clientesNovos.sort()).toEqual(["PARTIDO NOVO", "PLINIO"].sort());
    expect(relatorio.naoAlocadas).toHaveLength(1);
    expect(relatorio.naoAlocadas[0].valor).toBe(300);

    const resultado = await confirmarImportacao(parsed, { modo: "substituir" }, prisma);
    expect(resultado.receitasCriadas).toBe(3);
    expect(resultado.despesasCriadas).toBe(4);

    // "Gráfica ABC" e "  gráfica abc  " devem virar UM único fornecedor
    const fornecedores = await prisma.fornecedor.findMany();
    expect(fornecedores).toHaveLength(3); // Gráfica ABC, Marketing XYZ, Buffet Silva
    const grafica = fornecedores.find((f) => f.nome === "Gráfica ABC");
    expect(grafica).toBeTruthy();
    const despesasDaGrafica = await prisma.despesa.findMany({ where: { fornecedorId: grafica!.id } });
    expect(despesasDaGrafica).toHaveLength(2);

    const clientes = await prisma.cliente.findMany();
    expect(clientes.map((c) => c.nome).sort()).toEqual(["PARTIDO NOVO", "PLINIO"]);
    const partidoNovo = clientes.find((c) => c.nome === "PARTIDO NOVO")!;
    expect(partidoNovo.isCandidato).toBe(false);
    const plinio = clientes.find((c) => c.nome === "PLINIO")!;
    expect(plinio.isCandidato).toBe(true);

    const despesaTodas = await prisma.despesa.findFirst({ where: { rateio: "TODAS" } });
    expect(despesaTodas?.clienteId).toBeNull();

    const despesaEspecifica = await prisma.despesa.findFirst({
      where: { rateio: "ESPECIFICA" },
      include: { cliente: true },
    });
    expect(despesaEspecifica?.cliente?.nome).toBe("PLINIO");
  });

  it("reimportação com 'ignorar_duplicados' não duplica linhas já existentes", async () => {
    const parsed = parseWorkbook(buildWorkbook());
    const resultado = await confirmarImportacao(parsed, { modo: "ignorar_duplicados" }, prisma);
    expect(resultado.receitasCriadas).toBe(0);
    expect(resultado.despesasCriadas).toBe(0);
    expect(resultado.receitasIgnoradas).toBe(3);
    expect(resultado.despesasIgnoradas).toBe(4);

    const totalReceitas = await prisma.receita.count();
    const totalDespesas = await prisma.despesa.count();
    expect(totalReceitas).toBe(3);
    expect(totalDespesas).toBe(4);
  });

  it("reimportação com 'substituir' zera e recarrega os lançamentos", async () => {
    const parsed = parseWorkbook(buildWorkbook());
    await confirmarImportacao(parsed, { modo: "substituir" }, prisma);
    const totalReceitas = await prisma.receita.count();
    const totalDespesas = await prisma.despesa.count();
    expect(totalReceitas).toBe(3);
    expect(totalDespesas).toBe(4);
    // fornecedores/clientes/grupos não são apagados no modo substituir, só os lançamentos
    const fornecedores = await prisma.fornecedor.count();
    expect(fornecedores).toBe(3);
  });
});
