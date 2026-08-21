import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate, LABEL_RATEIO, LABEL_STATUS_DESPESA } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { rankingFornecedores } from "@/lib/calc";
import { getDespesasCalc } from "@/lib/data/calc-data";

export default async function FornecedorDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [fornecedor, despesasTodas] = await Promise.all([
    prisma.fornecedor.findUnique({
      where: { id },
      include: {
        despesas: {
          include: { grupo: true, cliente: true },
          orderBy: { vencimento: "desc" },
        },
      },
    }),
    getDespesasCalc(),
  ]);

  if (!fornecedor) notFound();

  // Mesma função usada no ranking do dashboard/relatórios — nunca uma fórmula própria
  // por tela (ver auditoria financeira, seção "cálculo centralizado").
  const linha = rankingFornecedores(despesasTodas, Infinity).find((r) => r.fornecedorId === id);
  const total = linha?.total ?? 0;
  const pago = linha?.pago ?? 0;
  const aPagar = linha?.aPagar ?? 0;

  return (
    <div className="space-y-4">
      <Link href="/fornecedores" className="flex items-center gap-1 text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="h-4 w-4" /> Voltar para Fornecedores
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{fornecedor.nome}</h1>
          {fornecedor.documento && (
            <p className="text-sm text-muted-foreground">{fornecedor.documento}</p>
          )}
        </div>
        <Badge variant="outline">{fornecedor.tipo}</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Total lançado</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">{formatCurrency(total)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">Pago</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(pago)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">A pagar</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold text-amber-600 dark:text-amber-400">
            {formatCurrency(aPagar)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Histórico de pagamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead>Campanha</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fornecedor.despesas.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{d.descricao}</TableCell>
                  <TableCell>{d.grupo.nome}</TableCell>
                  <TableCell>{d.cliente?.nome ?? LABEL_RATEIO[d.rateio]}</TableCell>
                  <TableCell>{formatDate(d.vencimento)}</TableCell>
                  <TableCell>
                    <Badge variant={d.status === "PAGO" ? "default" : "secondary"}>
                      {LABEL_STATUS_DESPESA[d.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(Number(d.valor))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
