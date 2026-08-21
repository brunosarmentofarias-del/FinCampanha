import Link from "next/link";
import { Users } from "lucide-react";
import { fluxoPorMes, resultadoPorCampanha, resumoExecutivo, resumoPorCliente } from "@/lib/calc";
import { getClientesCalc, getDespesasCalc, getReceitasCalc } from "@/lib/data/calc-data";
import { Button } from "@/components/ui/button";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { ReceivedVsReceivable, PaidVsPayable } from "@/components/dashboard/financial-progress";
import { UnallocatedAlert } from "@/components/dashboard/unallocated-alert";
import { BarrasCampanha } from "@/components/dashboard/barras-campanha";
import { FluxoAreaChart } from "@/components/dashboard/fluxo-area-chart";
import { ExecutiveSummary } from "@/components/dashboard/executive-summary";
import { calcularIntervalo, type PeriodoPreset } from "@/lib/periodo";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string; periodo?: string }>;
}) {
  const { cliente: clienteIdFiltro, periodo } = await searchParams;

  const [clientes, receitasTodas, despesasTodas] = await Promise.all([
    getClientesCalc(),
    getReceitasCalc(),
    getDespesasCalc(),
  ]);

  if (receitasTodas.length === 0 && despesasTodas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-24 text-center">
        <Users className="h-10 w-10 text-muted-foreground" />
        <div>
          <p className="font-medium">Nenhum lançamento ainda</p>
          <p className="text-sm text-muted-foreground">
            Cadastre clientes, fornecedores e lançamentos para começar.
          </p>
        </div>
        <Button render={<Link href="/clientes" />} nativeButton={false}>
          <Users className="mr-1 h-4 w-4" /> Ir para Clientes
        </Button>
      </div>
    );
  }

  const { desde, ate } = calcularIntervalo((periodo as PeriodoPreset | null) ?? "ano");
  const noPeriodo = (data: Date) => (!desde || !ate ? true : data >= desde && data <= ate);

  const receitas = receitasTodas.filter((r) => noPeriodo(r.vencimento));
  const despesas = despesasTodas.filter((d) => noPeriodo(d.vencimento));

  // resultadoPorCampanha depende do dataset completo (o rateio precisa da base inteira) —
  // filtramos só a linha exibida, nunca os lançamentos usados para calcular a proporção.
  const resultadoCampanhas = resultadoPorCampanha(receitas, despesas, clientes);
  const naoAlocadas = despesas.filter((d) => d.rateio === "NAO_ALOCADA");
  // Mesmo valor que a linha "Não alocado" do gráfico — nunca recalculado à parte
  // (ver auditoria financeira, seção "cálculo centralizado").
  const totalNaoAlocado =
    resultadoCampanhas.find((l) => l.clienteId === null)?.despesaEspecifica ?? 0;

  const clienteSelecionado = clienteIdFiltro
    ? clientes.find((c) => c.id === clienteIdFiltro)
    : null;

  const despesasFiltradas = clienteSelecionado
    ? despesas.filter((d) => d.clienteId === clienteSelecionado.id)
    : despesas;
  const receitasFiltradas = clienteSelecionado
    ? receitas.filter((r) => r.clienteId === clienteSelecionado.id)
    : receitas;

  const resumo = clienteSelecionado
    ? resumoPorCliente(
        resultadoCampanhas.find((l) => l.clienteId === clienteSelecionado.id)!,
        despesasFiltradas,
        receitasFiltradas
      )
    : resumoExecutivo(receitas, despesas);

  const fluxoPagar = fluxoPorMes("PAGAR", despesasFiltradas, receitasFiltradas);

  return (
    <div className="space-y-6">
      {clienteSelecionado && (
        <p className="text-sm text-muted-foreground">
          Exibindo dados de <span className="font-medium text-foreground">{clienteSelecionado.nome}</span>
        </p>
      )}

      <KpiCards resumo={resumo} />

      <div className="grid gap-4 lg:grid-cols-3">
        <ReceivedVsReceivable recebido={resumo.receitaRecebida} aReceber={resumo.receitaAReceber} />
        <PaidVsPayable pago={resumo.despesaPaga} aPagar={resumo.despesaAPagar} />
        <UnallocatedAlert total={totalNaoAlocado} quantidade={naoAlocadas.length} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <BarrasCampanha linhas={resultadoCampanhas} />
        <FluxoAreaChart meses={fluxoPagar} />
      </div>

      <ExecutiveSummary resumo={resumo} />
    </div>
  );
}
