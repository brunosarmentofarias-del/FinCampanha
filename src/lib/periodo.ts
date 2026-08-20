export type PeriodoPreset = "todo" | "ano" | "mes" | "30dias";

export const PERIODO_LABELS: Record<PeriodoPreset, string> = {
  todo: "Todo o período",
  ano: "Este ano",
  mes: "Este mês",
  "30dias": "Últimos 30 dias",
};

export function calcularIntervalo(
  preset: PeriodoPreset,
  referencia: Date = new Date()
): { desde: Date | null; ate: Date | null } {
  switch (preset) {
    case "ano":
      return {
        desde: new Date(referencia.getFullYear(), 0, 1),
        ate: new Date(referencia.getFullYear(), 11, 31),
      };
    case "mes":
      return {
        desde: new Date(referencia.getFullYear(), referencia.getMonth(), 1),
        ate: new Date(referencia.getFullYear(), referencia.getMonth() + 1, 0),
      };
    case "30dias":
      return {
        desde: new Date(referencia.getTime() - 29 * 86400000),
        ate: referencia,
      };
    case "todo":
    default:
      return { desde: null, ate: null };
  }
}
