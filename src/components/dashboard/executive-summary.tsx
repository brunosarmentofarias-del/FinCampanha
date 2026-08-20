import { Banknote, CreditCard, TrendingUp, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ResumoLike {
  receitaContratada: number;
  receitaRecebida: number;
  receitaAReceber: number;
  despesaTotal: number;
  despesaPaga: number;
  despesaAPagar: number;
  resultadoProjetado: number;
  margemProjetada: number;
  caixaRealizado: number;
  margemReal: number;
}

function Linha({
  label,
  valor,
  destaque,
}: {
  label: string;
  valor: React.ReactNode;
  destaque?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn("text-sm tabular-nums", destaque && "font-semibold")}>{valor}</span>
    </div>
  );
}

export function ExecutiveSummary({ resumo }: { resumo: ResumoLike }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Resumo Executivo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Wallet className="h-3.5 w-3.5" /> Receita
            </p>
            <Linha label="Contratada" valor={formatCurrency(resumo.receitaContratada)} destaque />
            <Linha
              label="Recebida"
              valor={
                <span className="text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(resumo.receitaRecebida)}
                </span>
              }
            />
            <Linha label="A Receber" valor={formatCurrency(resumo.receitaAReceber)} />
          </div>

          <div className="space-y-2 sm:border-l sm:pl-6">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <CreditCard className="h-3.5 w-3.5" /> Despesa
            </p>
            <Linha label="Total" valor={formatCurrency(resumo.despesaTotal)} destaque />
            <Linha label="Paga" valor={formatCurrency(resumo.despesaPaga)} />
            <Linha label="A Pagar" valor={formatCurrency(resumo.despesaAPagar)} />
          </div>

          <div className="space-y-2 lg:border-l lg:pl-6">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" /> Resultado
            </p>
            <p
              className={cn(
                "text-lg font-semibold tabular-nums",
                resumo.resultadoProjetado >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              )}
            >
              {formatCurrency(resumo.resultadoProjetado)}
            </p>
            <p className="text-xs text-muted-foreground">Resultado Projetado</p>
            <p className="text-sm font-medium text-primary">
              {formatPercent(resumo.margemProjetada)}{" "}
              <span className="text-xs font-normal text-muted-foreground">Margem Projetada</span>
            </p>
            <p className="text-sm font-medium text-primary">
              {formatPercent(resumo.margemReal)}{" "}
              <span className="text-xs font-normal text-muted-foreground">Margem Real</span>
            </p>
          </div>

          <div className="space-y-2 lg:border-l lg:pl-6">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Banknote className="h-3.5 w-3.5" /> Caixa Realizado
            </p>
            <p className="text-lg font-semibold tabular-nums text-primary">
              {formatCurrency(resumo.caixaRealizado)}
            </p>
            <p className="text-xs text-muted-foreground">Recebido − Pago</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
