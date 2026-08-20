import { getRelatorioData } from "@/lib/data/relatorio-data";
import { RelatoriosClient } from "./relatorios-client";

export default async function RelatoriosPage() {
  const data = await getRelatorioData();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Relatórios</h1>
        <p className="text-sm text-muted-foreground">
          Exporte os números atuais em XLSX (reproduzindo as abas da planilha original) ou em PDF
          (resumo executivo em uma página).
        </p>
      </div>
      <RelatoriosClient
        resumo={data.resumo}
        despesasPorGrupo={data.despesasPorGrupo}
        receitaPorCliente={data.receitaPorCliente}
        resultadoPorCampanha={data.resultadoPorCampanha}
        fluxoPagar={data.fluxoPagar}
      />
    </div>
  );
}
