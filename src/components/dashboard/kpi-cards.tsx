import { Briefcase, CheckCircle2, Clock, CreditCard, Percent, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ResumoLike {
  receitaContratada: number;
  receitaRecebida: number;
  receitaAReceber: number;
  despesaTotal: number;
  resultadoProjetado: number;
  margemProjetada: number;
  margemReal: number;
}

const TOM = {
  neutro: { icon: "bg-primary/10 text-primary", valor: "text-foreground" },
  verde: {
    icon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    valor: "text-emerald-600 dark:text-emerald-400",
  },
  azul: { icon: "bg-primary/10 text-primary", valor: "text-primary" },
  vermelho: {
    icon: "bg-red-500/10 text-red-600 dark:text-red-400",
    valor: "text-red-600 dark:text-red-400",
  },
};

export function KpiCards({ resumo }: { resumo: ResumoLike }) {
  const resultadoTom = resumo.resultadoProjetado >= 0 ? TOM.verde : TOM.vermelho;

  const cards: { label: string; valor: React.ReactNode; icon: typeof Briefcase; tom: (typeof TOM)[keyof typeof TOM] }[] = [
    {
      label: "Receita Contratada",
      valor: formatCurrency(resumo.receitaContratada),
      icon: Briefcase,
      tom: TOM.neutro,
    },
    {
      label: "Receita Recebida",
      valor: formatCurrency(resumo.receitaRecebida),
      icon: CheckCircle2,
      tom: TOM.verde,
    },
    {
      label: "A Receber",
      valor: formatCurrency(resumo.receitaAReceber),
      icon: Clock,
      tom: TOM.azul,
    },
    {
      label: "Despesa Total",
      valor: formatCurrency(resumo.despesaTotal),
      icon: CreditCard,
      tom: TOM.vermelho,
    },
    {
      label: "Resultado Projetado",
      valor: formatCurrency(resumo.resultadoProjetado),
      icon: TrendingUp,
      tom: resultadoTom,
    },
    {
      // Projetada = receita contratada x despesa total (competência); Real = caixa
      // realizado x receita recebida (regime de caixa) — mesmo quadro, lado a lado,
      // para não mexer na grade de 6 KPIs do dashboard.
      label: "Margem Projetada / Real",
      valor: (
        <span className="flex items-baseline gap-1 whitespace-nowrap">
          {formatPercent(resumo.margemProjetada)}
          <span className="text-xs font-normal text-muted-foreground">/</span>
          <span className={resumo.margemReal >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
            {formatPercent(resumo.margemReal)}
          </span>
        </span>
      ),
      icon: Percent,
      tom: TOM.azul,
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 2xl:grid-cols-6">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="flex items-start gap-2.5 p-3.5">
            <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", c.tom.icon)}>
              <c.icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-muted-foreground">{c.label}</p>
              <p className={cn("text-base font-semibold leading-tight tabular-nums", c.tom.valor)}>
                {c.valor}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
