import { fluxoPorMes } from "@/lib/calc";
import { getDespesasCalc, getReceitasCalc } from "@/lib/data/calc-data";
import { FluxoTabs } from "./fluxo-tabs";

export default async function FluxoPage() {
  const [receitas, despesas] = await Promise.all([getReceitasCalc(), getDespesasCalc()]);

  const fluxoPagar = fluxoPorMes("PAGAR", despesas, receitas);
  const fluxoReceber = fluxoPorMes("RECEBER", despesas, receitas);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Fluxo</h1>
        <p className="text-sm text-muted-foreground">
          Fluxo a pagar e a receber por mês, com drill-down e acumulado.
        </p>
      </div>
      <FluxoTabs fluxoPagar={fluxoPagar} fluxoReceber={fluxoReceber} />
    </div>
  );
}
