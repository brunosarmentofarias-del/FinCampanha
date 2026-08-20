import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import type { RankingFornecedor } from "@/lib/calc";

export function RankingFornecedores({ ranking }: { ranking: RankingFornecedor[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Top 10 Fornecedores</CardTitle>
      </CardHeader>
      <CardContent>
        {ranking.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Sem despesas lançadas.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fornecedor</TableHead>
                <TableHead className="text-right">Pago</TableHead>
                <TableHead className="text-right">A Pagar</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranking.map((r) => (
                <TableRow key={r.fornecedorId}>
                  <TableCell className="max-w-[180px] truncate">{r.fornecedorNome}</TableCell>
                  <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(r.pago)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-amber-600 dark:text-amber-400">
                    {formatCurrency(r.aPagar)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {formatCurrency(r.total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
