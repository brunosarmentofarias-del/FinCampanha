// Teste de integração "dourado": importa a planilha REAL (Resultado_Campanha_2026.xlsx)
// e confere os números de referência documentados no README/docs/IMPORTACAO.md.
//
// Este teste fica pendente (skip) até você colocar o arquivo real em:
//   fixtures/Resultado_Campanha_2026.xlsx
// A partir daí ele roda de verdade e valida a importação ponta a ponta contra
// os valores conhecidos da planilha original.

import { execSync } from "child_process";
import { existsSync, readFileSync, rmSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  agingRecebiveis,
  despesasPorGrupo,
  fluxoPorMes,
  resultadoPorCampanha,
  resumoExecutivo,
  type ClienteCalc,
  type DespesaCalc,
  type GrupoCalc,
  type ReceitaCalc,
} from "@/lib/calc";
import { parseWorkbook } from "./excel";
import { confirmarImportacao } from "./service";

const FIXTURE_PATH = path.resolve(__dirname, "../../../fixtures/Resultado_Campanha_2026.xlsx");
const TEM_FIXTURE = existsSync(FIXTURE_PATH);

const TEST_DB_PATH = path.resolve(__dirname, "../../../prisma/golden-test.db");
const TEST_DATABASE_URL = `file:${TEST_DB_PATH}`;

const GRUPOS_PADRAO = [
  "Prestadores de Serviço",
  "Marketing / Impulsionamento",
  "Alimentação",
  "Gráfica",
  "Transporte",
  "Outros",
];

const TOLERANCIA = 0.01;

describe.skipIf(!TEM_FIXTURE)("Importação da planilha real — dataset de referência", () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    if (existsSync(TEST_DB_PATH)) rmSync(TEST_DB_PATH);
    execSync("npx prisma db push --skip-generate --accept-data-loss", {
      cwd: path.resolve(__dirname, "../../.."),
      env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
      stdio: "pipe",
    });

    prisma = new PrismaClient({ datasources: { db: { url: TEST_DATABASE_URL } } });
    for (const nome of GRUPOS_PADRAO) {
      await prisma.grupoDespesa.upsert({ where: { nome }, update: {}, create: { nome } });
    }

    const buffer = readFileSync(FIXTURE_PATH);
    const parsed = parseWorkbook(buffer);
    expect(parsed.erros, `Erros ao ler a planilha: ${JSON.stringify(parsed.erros)}`).toHaveLength(0);

    await confirmarImportacao(parsed, { modo: "substituir" }, prisma);
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    if (existsSync(TEST_DB_PATH)) rmSync(TEST_DB_PATH);
  });

  async function carregarDados() {
    const [receitasDb, despesasDb, clientesDb, gruposDb] = await Promise.all([
      prisma.receita.findMany({ include: { cliente: true } }),
      prisma.despesa.findMany({ include: { fornecedor: true, grupo: true, cliente: true } }),
      prisma.cliente.findMany(),
      prisma.grupoDespesa.findMany(),
    ]);

    const receitas: ReceitaCalc[] = receitasDb.map((r) => ({
      id: r.id,
      clienteId: r.clienteId,
      clienteNome: r.cliente.nome,
      descricao: r.descricao,
      vencimento: r.vencimento,
      dataPagamento: r.dataPagamento,
      valor: Number(r.valor),
      status: r.status,
    }));

    const despesas: DespesaCalc[] = despesasDb.map((d) => ({
      id: d.id,
      fornecedorId: d.fornecedorId,
      fornecedorNome: d.fornecedor.nome,
      grupoId: d.grupoId,
      grupoNome: d.grupo.nome,
      descricao: d.descricao,
      vencimento: d.vencimento,
      dataPagamento: d.dataPagamento,
      valor: Number(d.valor),
      status: d.status,
      rateio: d.rateio,
      clienteId: d.clienteId,
      clienteNome: d.cliente?.nome ?? null,
    }));

    const clientes: ClienteCalc[] = clientesDb.map((c) => ({
      id: c.id,
      nome: c.nome,
      isCandidato: c.isCandidato,
    }));

    const grupos: GrupoCalc[] = gruposDb.map((g) => ({ id: g.id, nome: g.nome, cor: g.cor }));

    return { receitas, despesas, clientes, grupos };
  }

  it("contagem de lançamentos, clientes e grupos", async () => {
    const { receitas, despesas, clientes, grupos } = await carregarDados();
    expect(receitas).toHaveLength(14);
    expect(despesas).toHaveLength(77);
    expect(clientes).toHaveLength(6);
    expect(grupos.filter((g) => despesas.some((d) => d.grupoId === g.id))).toHaveLength(6);
  });

  it("resumo executivo bate com os valores de referência", async () => {
    const { receitas, despesas } = await carregarDados();
    const r = resumoExecutivo(receitas, despesas);
    expect(r.receitaContratada).toBeCloseTo(930_000, 2);
    expect(r.receitaRecebida).toBeCloseTo(310_000, 2);
    expect(r.receitaAReceber).toBeCloseTo(620_000, 2);
    expect(r.despesaTotal).toBeCloseTo(249_307.49, 2);
    expect(r.despesaPaga).toBeCloseTo(117_272.02, 2);
    expect(r.despesaAPagar).toBeCloseTo(132_035.47, 2);
    expect(r.resultadoProjetado).toBeCloseTo(680_692.51, 2);
    expect(r.margemProjetada).toBeCloseTo(0.732, 3);
    expect(r.caixaRealizado).toBeCloseTo(192_727.98, 2);
  });

  it("despesas por grupo batem com os valores de referência", async () => {
    const { despesas, grupos } = await carregarDados();
    const rows = despesasPorGrupo(despesas, grupos);
    const totalPorNome = Object.fromEntries(rows.map((r) => [r.grupoNome, r.total]));
    expect(totalPorNome["Prestadores de Serviço"]).toBeCloseTo(239_559.49, 2);
    expect(totalPorNome["Marketing / Impulsionamento"]).toBeCloseTo(6_500, 2);
    expect(totalPorNome["Alimentação"]).toBeCloseTo(2_468, 2);
    expect(totalPorNome["Gráfica"]).toBeCloseTo(540, 2);
    expect(totalPorNome["Transporte"]).toBeCloseTo(180, 2);
    expect(totalPorNome["Outros"]).toBeCloseTo(60, 2);
  });

  it("resultado por campanha bate e mantém a invariante com o resumo executivo", async () => {
    const { receitas, despesas, clientes } = await carregarDados();
    const linhas = resultadoPorCampanha(receitas, despesas, clientes);
    const porNome = Object.fromEntries(linhas.map((l) => [l.clienteNome, l]));

    expect(porNome["PLINIO"].resultado).toBeCloseTo(168_572.05, 2);
    expect(porNome["GEORGE"].resultado).toBeCloseTo(131_490.82, 2);
    expect(porNome["ATILA"].resultado).toBeCloseTo(168_556.95, 2);
    expect(porNome["DAVID"].resultado).toBeCloseTo(139_067.95, 2);
    expect(porNome["PAULO"].resultado).toBeCloseTo(45_191.74, 2);
    expect(porNome["PARTIDO NOVO"].resultado).toBeCloseTo(35_813.0, 2);
    expect(porNome["Não alocado"].resultado).toBeCloseTo(-8_000, 2);

    const poolTodas = despesas
      .filter((d) => d.rateio === "TODAS")
      .reduce((acc, d) => acc + d.valor, 0);
    expect(poolTodas).toBeCloseTo(85_587.07, 2);

    const naoAlocadas = despesas.filter((d) => d.rateio === "NAO_ALOCADA");
    expect(naoAlocadas).toHaveLength(2);
    expect(naoAlocadas.reduce((acc, d) => acc + d.valor, 0)).toBeCloseTo(8_000, 2);

    const somaResultados = linhas.reduce((acc, l) => acc + l.resultado, 0);
    const resumo = resumoExecutivo(receitas, despesas);
    expect(Math.abs(somaResultados - resumo.resultadoProjetado)).toBeLessThanOrEqual(TOLERANCIA);
  });

  it("fluxo a pagar por mês bate com os valores de referência", async () => {
    const { receitas, despesas } = await carregarDados();
    const meses = fluxoPorMes("PAGAR", despesas, receitas);
    const totalPorMes = Object.fromEntries(meses.map((m) => [m.mes.slice(5), m.total]));
    expect(totalPorMes["07"]).toBeCloseTo(1_500, 2);
    expect(totalPorMes["08"]).toBeCloseTo(7_825.8, 2);
    expect(totalPorMes["09"]).toBeCloseTo(60_709.67, 2);
    expect(totalPorMes["10"]).toBeCloseTo(62_000, 2);
  });

  it("aging de recebíveis não perde nenhum lançamento pendente", async () => {
    const { receitas } = await carregarDados();
    const buckets = agingRecebiveis(receitas, new Date());
    const total = Object.values(buckets).reduce((acc, b) => acc + b.valor, 0);
    const aReceber = receitas
      .filter((r) => r.status === "A_RECEBER")
      .reduce((acc, r) => acc + r.valor, 0);
    expect(total).toBeCloseTo(aReceber, 2);
    expect(aReceber).toBeCloseTo(620_000, 2);
  });
});
