import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate, LABEL_STATUS_DESPESA, LABEL_STATUS_RECEITA } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { fluxoPorMes, resultadoPorCampanha, resumoPorCliente } from "@/lib/calc";
import { getClientesCalc, getDespesasCalc, getReceitasCalc } from "@/lib/data/calc-data";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { ReceivedVsReceivable, PaidVsPayable } from "@/components/dashboard/financial-progress";
import { FluxoAreaChart } from "@/components/dashboard/fluxo-area-chart";

export default async function ClienteDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cliente = await prisma.cliente.findUnique({ where: { id } });
  if (!cliente) notFound();

  const [clientesCalc, receitasTodas, despesasTodas] = await Promise.all([
    getClientesCalc(),
    getReceitasCalc(),
    getDespesasCalc(),
  ]);

  // resultadoPorCampanha precisa do dataset inteiro (o rateio de "TODAS" depende da
  // base de todos os clientes) — só filtramos a linha exibida, não os lançamentos usados no cálculo.
  const linha = resultadoPorCampanha(receitasTodas, despesasTodas, clientesCalc).find(
    (l) => l.clienteId === id
  )!;
  const despesasCliente = despesasTodas
    .filter((d) => d.clienteId === id)
    .sort((a, b) => b.vencimento.getTime() - a.vencimento.getTime());
  const receitasCliente = receitasTodas
    .filter((r) => r.clienteId === id)
    .sort((a, b) => b.vencimento.getTime() - a.vencimento.getTime());

  const resumo = resumoPorCliente(linha, despesasCliente, receitasCliente);
  const fluxoPagar = fluxoPorMes("PAGAR", despesasCliente, receitasCliente);

  return (
    <div className="space-y-6">
      <Link href="/clientes" className="flex items-center gap-1 text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="h-4 w-4" /> Voltar para Clientes
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{cliente.nome}</h1>
          {cliente.nomeCompleto && <p className="text-sm text-muted-foreground">{cliente.nomeCompleto}</p>}
        </div>
        <Badge variant={cliente.isCandidato ? "default" : "outline"}>
          {cliente.isCandidato ? "Candidato (entra no rateio)" : "Serviço específico"}
        </Badge>
      </div>

      <KpiCards resumo={resumo} />

      {linha.rateioTodas > 0 && (
        <p className="text-xs text-muted-foreground">
          Despesa Total e Resultado acima incluem {formatCurrency(linha.rateioTodas)} de rateio de despesas
          compartilhadas ("TODAS" as campanhas) — os lançamentos individuais abaixo mostram só as despesas
          específicas desta campanha.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <ReceivedVsReceivable recebido={resumo.receitaRecebida} aReceber={resumo.receitaAReceber} />
        <PaidVsPayable pago={resumo.despesaPaga} aPagar={resumo.despesaAPagar} />
      </div>

      <FluxoAreaChart meses={fluxoPagar} />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Receitas desta campanha</CardTitle>
        </CardHeader>
        <CardContent>
          {receitasCliente.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma receita cadastrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Data Pagto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receitasCliente.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.descricao}</TableCell>
                    <TableCell>{formatDate(r.vencimento)}</TableCell>
                    <TableCell>{r.dataPagamento ? formatDate(r.dataPagamento) : "—"}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "RECEBIDO" ? "default" : "secondary"}>
                        {LABEL_STATUS_RECEITA[r.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(r.valor)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Despesas específicas desta campanha</CardTitle>
        </CardHeader>
        <CardContent>
          {despesasCliente.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhuma despesa específica cadastrada.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {despesasCliente.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="max-w-[200px] truncate font-medium" title={d.fornecedorNome}>
                      {d.fornecedorNome}
                    </TableCell>
                    <TableCell>{d.descricao}</TableCell>
                    <TableCell>{d.grupoNome}</TableCell>
                    <TableCell>{formatDate(d.vencimento)}</TableCell>
                    <TableCell>
                      <Badge variant={d.status === "PAGO" ? "default" : "secondary"}>
                        {LABEL_STATUS_DESPESA[d.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(d.valor)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
