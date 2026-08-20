import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/format";

interface ResumoLike {
  receitaRecebida: number;
  receitaAReceber: number;
  despesaPaga: number;
  despesaAPagar: number;
}

export function ProgressBars({ resumo }: { resumo: ResumoLike }) {
  const totalReceita = resumo.receitaRecebida + resumo.receitaAReceber;
  const totalDespesa = resumo.despesaPaga + resumo.despesaAPagar;
  const pctReceita = totalReceita === 0 ? 0 : (resumo.receitaRecebida / totalReceita) * 100;
  const pctDespesa = totalDespesa === 0 ? 0 : (resumo.despesaPaga / totalDespesa) * 100;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Recebido vs A Receber</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={pctReceita} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Recebido: {formatCurrency(resumo.receitaRecebida)}</span>
            <span>A Receber: {formatCurrency(resumo.receitaAReceber)}</span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Pago vs A Pagar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={pctDespesa} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Pago: {formatCurrency(resumo.despesaPaga)}</span>
            <span>A Pagar: {formatCurrency(resumo.despesaAPagar)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
