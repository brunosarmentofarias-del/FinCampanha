import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/format";

interface Segmento {
  label: string;
  valor: number;
  pct: number;
  corBarra: string;
  corTexto: string;
}

function BarraDuasCores({ titulo, segmentos }: { titulo: string; segmentos: [Segmento, Segmento] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex h-7 w-full overflow-hidden rounded-md bg-muted text-xs font-semibold">
          {segmentos.map((s) =>
            s.pct > 0.06 ? (
              <div
                key={s.label}
                className={`flex items-center justify-center text-white ${s.corBarra}`}
                style={{ width: `${s.pct * 100}%` }}
              >
                {formatPercent(s.pct)}
              </div>
            ) : null
          )}
        </div>
        <div className="flex justify-between text-sm">
          {segmentos.map((s) => (
            <div key={s.label}>
              <p className="font-medium tabular-nums">{formatCurrency(s.valor)}</p>
              <p className={`text-xs ${s.corTexto}`}>{s.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ReceivedVsReceivable({ recebido, aReceber }: { recebido: number; aReceber: number }) {
  const total = recebido + aReceber;
  const pctRecebido = total === 0 ? 0 : recebido / total;
  return (
    <BarraDuasCores
      titulo="Recebido vs A Receber"
      segmentos={[
        {
          label: "Recebido",
          valor: recebido,
          pct: pctRecebido,
          corBarra: "bg-emerald-600",
          corTexto: "text-emerald-600 dark:text-emerald-400",
        },
        {
          label: "A receber",
          valor: aReceber,
          pct: 1 - pctRecebido,
          corBarra: "bg-primary/60",
          corTexto: "text-primary",
        },
      ]}
    />
  );
}

export function PaidVsPayable({ pago, aPagar }: { pago: number; aPagar: number }) {
  const total = pago + aPagar;
  const pctPago = total === 0 ? 0 : pago / total;
  return (
    <BarraDuasCores
      titulo="Pago vs A Pagar"
      segmentos={[
        {
          label: "Pago",
          valor: pago,
          pct: pctPago,
          corBarra: "bg-red-600",
          corTexto: "text-red-600 dark:text-red-400",
        },
        {
          label: "A pagar",
          valor: aPagar,
          pct: 1 - pctPago,
          corBarra: "bg-amber-500",
          corTexto: "text-amber-600 dark:text-amber-400",
        },
      ]}
    />
  );
}
