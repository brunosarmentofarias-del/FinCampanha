import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import type { AgingRecebiveis } from "@/lib/calc";

export function AgingTable({ aging }: { aging: AgingRecebiveis }) {
  const linhas = Object.values(aging);
  const total = linhas.reduce((acc, b) => acc + b.valor, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Aging de Recebíveis</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Faixa</TableHead>
              <TableHead className="text-right">Qtd.</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map((b) => (
              <TableRow key={b.label}>
                <TableCell>{b.label}</TableCell>
                <TableCell className="text-right tabular-nums">{b.quantidade}</TableCell>
                <TableCell className="text-right tabular-nums text-amber-600 dark:text-amber-400">
                  {formatCurrency(b.valor)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="font-medium">
              <TableCell>Total</TableCell>
              <TableCell className="text-right tabular-nums">
                {linhas.reduce((acc, b) => acc + b.quantidade, 0)}
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatCurrency(total)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
