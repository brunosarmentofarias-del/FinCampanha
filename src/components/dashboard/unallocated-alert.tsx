import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

export function UnallocatedAlert({ total, quantidade }: { total: number; quantidade: number }) {
  if (quantidade === 0) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="flex h-full flex-col justify-center gap-1 p-4">
          <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" /> Tudo certo
          </p>
          <p className="text-sm text-muted-foreground">
            Não existem despesas pendentes de classificação.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-500/40 bg-amber-500/5">
      <CardContent className="flex h-full flex-col justify-center gap-1.5 p-4">
        <p className="flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4" /> Existem despesas NÃO ALOCADAS
        </p>
        <p className="text-sm text-muted-foreground">
          Total: <span className="font-semibold text-foreground">{formatCurrency(total)}</span> em{" "}
          {quantidade} lançamento(s)
        </p>
        <p className="text-xs text-muted-foreground">
          Classifique essas despesas para distribuir corretamente os custos.
        </p>
        <Button
          render={<Link href="/despesas?rateio=NAO_ALOCADA" />}
          nativeButton={false}
          variant="outline"
          size="sm"
          className="mt-1 w-fit border-amber-500/40 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400"
        >
          Ver e corrigir
        </Button>
      </CardContent>
    </Card>
  );
}
