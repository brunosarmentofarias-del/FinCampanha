import { describe, expect, it } from "vitest";
import {
  agingRecebiveis,
  despesasPorGrupo,
  fluxoPorMes,
  rankingFornecedores,
  receitaPorCliente,
  resultadoPorCampanha,
  resumoExecutivo,
  resumoPorCliente,
  type ClienteCalc,
  type DespesaCalc,
  type GrupoCalc,
  type ReceitaCalc,
} from "./calc";

const clientes: ClienteCalc[] = [
  { id: "c1", nome: "PLINIO", isCandidato: true },
  { id: "c2", nome: "GEORGE", isCandidato: true },
  { id: "c3", nome: "PARTIDO NOVO", isCandidato: false },
];

const grupos: GrupoCalc[] = [
  { id: "g1", nome: "Prestadores de Serviço", cor: "#000" },
  { id: "g2", nome: "Marketing", cor: "#111" },
];

const receitas: ReceitaCalc[] = [
  {
    id: "r1",
    clienteId: "c1",
    clienteNome: "PLINIO",
    descricao: "CAMPANHA 2026 - 1/2",
    vencimento: new Date(2026, 0, 10),
    dataPagamento: new Date(2026, 0, 10),
    valor: 100_000,
    status: "RECEBIDO",
  },
  {
    id: "r2",
    clienteId: "c1",
    clienteNome: "PLINIO",
    descricao: "CAMPANHA 2026 - 2/2",
    vencimento: new Date(2026, 2, 10),
    dataPagamento: null,
    valor: 100_000,
    status: "A_RECEBER",
  },
  {
    id: "r3",
    clienteId: "c2",
    clienteNome: "GEORGE",
    descricao: "CAMPANHA 2026",
    vencimento: new Date(2026, 1, 5),
    dataPagamento: new Date(2026, 1, 5),
    valor: 100_000,
    status: "RECEBIDO",
  },
  {
    id: "r4",
    clienteId: "c3",
    clienteNome: "PARTIDO NOVO",
    descricao: "CAMPANHA 2026",
    vencimento: new Date(2026, 1, 15),
    dataPagamento: null,
    valor: 20_000,
    status: "A_RECEBER",
  },
];

const despesas: DespesaCalc[] = [
  {
    id: "d1",
    fornecedorId: "f1",
    fornecedorNome: "Gráfica ABC",
    grupoId: "g1",
    grupoNome: "Prestadores de Serviço",
    descricao: "Consultoria",
    vencimento: new Date(2026, 0, 20),
    dataPagamento: new Date(2026, 0, 20),
    valor: 10_000,
    status: "PAGO",
    rateio: "ESPECIFICA",
    clienteId: "c1",
    clienteNome: "PLINIO",
  },
  {
    id: "d2",
    fornecedorId: "f2",
    fornecedorNome: "Marketing XYZ",
    grupoId: "g2",
    grupoNome: "Marketing",
    descricao: "Impulsionamento",
    vencimento: new Date(2026, 2, 1),
    dataPagamento: null,
    valor: 20_000,
    status: "A_PAGAR",
    rateio: "TODAS",
    clienteId: null,
    clienteNome: null,
  },
  {
    id: "d3",
    fornecedorId: "f1",
    fornecedorNome: "Gráfica ABC",
    grupoId: "g1",
    grupoNome: "Prestadores de Serviço",
    descricao: "Material sem campanha",
    vencimento: new Date(2026, 1, 25),
    dataPagamento: null,
    valor: 5_000,
    status: "A_PAGAR",
    rateio: "NAO_ALOCADA",
    clienteId: null,
    clienteNome: null,
  },
];

describe("resumoExecutivo", () => {
  it("calcula todos os agregados corretamente", () => {
    const r = resumoExecutivo(receitas, despesas);
    expect(r.receitaContratada).toBe(320_000);
    expect(r.receitaRecebida).toBe(200_000);
    expect(r.receitaAReceber).toBe(120_000);
    expect(r.despesaTotal).toBe(35_000);
    expect(r.despesaPaga).toBe(10_000);
    expect(r.despesaAPagar).toBe(25_000);
    expect(r.resultadoProjetado).toBe(285_000);
    expect(r.margemProjetada).toBeCloseTo(285_000 / 320_000, 6);
    expect(r.caixaRealizado).toBe(190_000);
    // Margem real = caixa realizado / receita recebida (regime de caixa),
    // diferente da margem projetada (receita contratada / despesa total).
    expect(r.margemReal).toBeCloseTo(190_000 / 200_000, 6);
  });

  it("margem é 0 quando não há receita", () => {
    const r = resumoExecutivo([], []);
    expect(r.margemProjetada).toBe(0);
    expect(r.margemReal).toBe(0);
  });

  it("margem real é 0 quando nada foi recebido ainda, mesmo com despesas pagas", () => {
    const semRecebimento = resumoExecutivo(
      receitas.map((r) => ({ ...r, status: "A_RECEBER" as const })),
      despesas
    );
    expect(semRecebimento.receitaRecebida).toBe(0);
    expect(semRecebimento.margemReal).toBe(0);
  });
});

describe("despesasPorGrupo", () => {
  it("agrupa e calcula percentuais", () => {
    const rows = despesasPorGrupo(despesas, grupos);
    const prestadores = rows.find((g) => g.grupoId === "g1")!;
    expect(prestadores.pago).toBe(10_000);
    expect(prestadores.aPagar).toBe(5_000);
    expect(prestadores.total).toBe(15_000);
    expect(prestadores.percentualDoTotal).toBeCloseTo(15_000 / 35_000, 6);

    const marketing = rows.find((g) => g.grupoId === "g2")!;
    expect(marketing.total).toBe(20_000);
  });
});

describe("receitaPorCliente", () => {
  it("agrupa recebido/a receber por cliente", () => {
    const rows = receitaPorCliente(receitas, clientes);
    const plinio = rows.find((c) => c.clienteId === "c1")!;
    expect(plinio.recebido).toBe(100_000);
    expect(plinio.aReceber).toBe(100_000);
    expect(plinio.contratoTotal).toBe(200_000);
  });
});

describe("resultadoPorCampanha", () => {
  it("aplica o rateio proporcional e mantém a invariante com o resumo executivo", () => {
    const linhas = resultadoPorCampanha(receitas, despesas, clientes);
    const resumo = resumoExecutivo(receitas, despesas);

    // baseRateio = 200.000 (PLINIO) + 100.000 (GEORGE) = 300.000
    // poolTodas = 20.000
    const plinio = linhas.find((l) => l.clienteNome === "PLINIO")!;
    expect(plinio.receita).toBe(200_000);
    expect(plinio.despesaEspecifica).toBe(10_000);
    expect(plinio.rateioTodas).toBeCloseTo(20_000 * (200_000 / 300_000), 6);
    expect(plinio.resultado).toBeCloseTo(
      200_000 - 10_000 - 20_000 * (200_000 / 300_000),
      6
    );

    const partidoNovo = linhas.find((l) => l.clienteNome === "PARTIDO NOVO")!;
    expect(partidoNovo.rateioTodas).toBe(0); // não é candidato, não entra no rateio

    const naoAlocado = linhas.find((l) => l.clienteNome === "Não alocado")!;
    expect(naoAlocado.resultado).toBe(-5_000);
    // A despesa não alocada precisa aparecer em despesaEspecifica, não só no resultado —
    // senão o gráfico mostra "Despesa Específica: R$ 0,00" com um resultado negativo,
    // uma inconsistência visual (receita 0 - despesa 0 != resultado -5000).
    expect(naoAlocado.despesaEspecifica).toBe(5_000);

    const somaResultados = linhas.reduce((acc, l) => acc + l.resultado, 0);
    expect(somaResultados).toBeCloseTo(resumo.resultadoProjetado, 2);
  });

  it("baseRateio zero não gera divisão por zero", () => {
    const semCandidatos: ClienteCalc[] = [{ id: "c9", nome: "X", isCandidato: false }];
    const linhas = resultadoPorCampanha([], despesas, semCandidatos);
    expect(linhas.every((l) => Number.isFinite(l.resultado))).toBe(true);
  });

  it("margem real usa só o que foi recebido/pago, não confunde com a projetada", () => {
    const linhas = resultadoPorCampanha(receitas, despesas, clientes);

    // PLINIO: recebeu 100.000 (a 2ª parcela ainda é A_RECEBER), pagou 10.000 de
    // despesa específica; a despesa "TODAS" de 20.000 ainda não foi paga, então
    // não entra no rateio real.
    const plinio = linhas.find((l) => l.clienteNome === "PLINIO")!;
    expect(plinio.receitaRecebida).toBe(100_000);
    expect(plinio.resultadoReal).toBe(90_000);
    expect(plinio.margemReal).toBeCloseTo(0.9, 6);

    const george = linhas.find((l) => l.clienteNome === "GEORGE")!;
    expect(george.receitaRecebida).toBe(100_000);
    expect(george.margemReal).toBeCloseTo(1, 6);

    // PARTIDO NOVO ainda não recebeu nada — margem real precisa ser null (sem base),
    // nunca um número que passe a falsa impressão de rentabilidade.
    const partidoNovo = linhas.find((l) => l.clienteNome === "PARTIDO NOVO")!;
    expect(partidoNovo.receitaRecebida).toBe(0);
    expect(partidoNovo.margemReal).toBeNull();

    const naoAlocado = linhas.find((l) => l.clienteNome === "Não alocado")!;
    expect(naoAlocado.margemReal).toBeNull();
  });
});

describe("resumoPorCliente", () => {
  it("reproduz o mesmo formato do resumoExecutivo, escopado a uma campanha", () => {
    const linhas = resultadoPorCampanha(receitas, despesas, clientes);
    const linhaPlinio = linhas.find((l) => l.clienteNome === "PLINIO")!;
    const despesasPlinio = despesas.filter((d) => d.clienteId === "c1");
    const receitasPlinio = receitas.filter((r) => r.clienteId === "c1");

    const r = resumoPorCliente(linhaPlinio, despesasPlinio, receitasPlinio);

    expect(r.receitaContratada).toBe(200_000);
    expect(r.receitaRecebida).toBe(100_000);
    expect(r.receitaAReceber).toBe(100_000);
    expect(r.despesaPaga).toBe(10_000);
    expect(r.caixaRealizado).toBe(90_000);
    expect(r.margemReal).toBeCloseTo(0.9, 6);
    // despesaTotal/resultadoProjetado devem incluir a fatia do rateio "TODAS", igual
    // à linha do gráfico "Resultado por Campanha" — não é só a despesa específica.
    expect(r.despesaTotal).toBeCloseTo(linhaPlinio.despesaEspecifica + linhaPlinio.rateioTodas, 6);
    expect(r.resultadoProjetado).toBe(linhaPlinio.resultado);
  });
});

describe("fluxoPorMes", () => {
  it("agrupa despesas a pagar por mês com drill-down por fornecedor e acumulado", () => {
    const meses = fluxoPorMes("PAGAR", despesas, receitas);
    expect(meses.map((m) => m.mes)).toEqual(["2026-02", "2026-03"]);

    const fev = meses.find((m) => m.mes === "2026-02")!;
    expect(fev.total).toBe(5_000);
    expect(fev.itens).toEqual([{ chave: "Gráfica ABC", valor: 5_000 }]);
    expect(fev.acumulado).toBe(5_000);

    const mar = meses.find((m) => m.mes === "2026-03")!;
    expect(mar.total).toBe(20_000);
    expect(mar.acumulado).toBe(25_000);
  });

  it("agrupa receitas a receber por mês", () => {
    const meses = fluxoPorMes("RECEBER", despesas, receitas);
    expect(meses.map((m) => m.mes)).toEqual(["2026-02", "2026-03"]);
    const total = meses.reduce((acc, m) => acc + m.total, 0);
    expect(total).toBe(120_000);
  });
});

describe("agingRecebiveis", () => {
  it("classifica pendências em buckets por atraso", () => {
    const referencia = new Date(2026, 2, 20); // 20/mar/2026
    const buckets = agingRecebiveis(receitas, referencia);
    // r2 vence 10/mar (10 dias de atraso) -> 1-30
    expect(buckets.d1_30.valor).toBe(100_000);
    // r4 vence 15/fev (33 dias de atraso) -> 31-60
    expect(buckets.d31_60.valor).toBe(20_000);
    expect(buckets.aVencer.valor).toBe(0);
  });
});

describe("rankingFornecedores", () => {
  it("ordena por valor total e faz split pago/a pagar", () => {
    const ranking = rankingFornecedores(despesas, 10);
    expect(ranking[0].fornecedorNome).toBe("Marketing XYZ");
    expect(ranking[0].total).toBe(20_000);
    expect(ranking[1].fornecedorNome).toBe("Gráfica ABC");
    expect(ranking[1].total).toBe(15_000);
    expect(ranking[1].pago).toBe(10_000);
    expect(ranking[1].aPagar).toBe(5_000);
  });

  it("respeita o topN", () => {
    const ranking = rankingFornecedores(despesas, 1);
    expect(ranking).toHaveLength(1);
  });
});
