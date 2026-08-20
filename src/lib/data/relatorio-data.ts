import {
  despesasPorGrupo,
  fluxoPorMes,
  receitaPorCliente,
  resultadoPorCampanha,
  resumoExecutivo,
} from "@/lib/calc";
import { getClientesCalc, getDespesasCalc, getGruposCalc, getReceitasCalc } from "@/lib/data/calc-data";

export async function getRelatorioData() {
  const [clientes, grupos, receitas, despesas] = await Promise.all([
    getClientesCalc(),
    getGruposCalc(),
    getReceitasCalc(),
    getDespesasCalc(),
  ]);

  return {
    resumo: resumoExecutivo(receitas, despesas),
    despesasPorGrupo: despesasPorGrupo(despesas, grupos),
    receitaPorCliente: receitaPorCliente(receitas, clientes),
    resultadoPorCampanha: resultadoPorCampanha(receitas, despesas, clientes),
    fluxoPagar: fluxoPorMes("PAGAR", despesas, receitas),
    fluxoReceber: fluxoPorMes("RECEBER", despesas, receitas),
    receitas,
    despesas,
  };
}

export type RelatorioData = Awaited<ReturnType<typeof getRelatorioData>>;
