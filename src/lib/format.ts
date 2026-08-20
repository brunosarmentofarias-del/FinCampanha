export function formatCurrency(valor: number): string {
  const abs = Math.abs(valor);
  const formatted = abs.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return valor < 0 ? `(${formatted})` : formatted;
}

/** Versão compacta para rótulos em gráficos (ex.: "R$ 4,2 mil") — nunca usar em totais. */
export function formatCurrencyCompacta(valor: number): string {
  const abs = Math.abs(valor);
  const formatted = abs.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  });
  return valor < 0 ? `(${formatted})` : formatted;
}

export function formatPercent(valor: number): string {
  return `${(valor * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

export function formatDate(data: Date | string | null | undefined): string {
  if (!data) return "—";
  const d = typeof data === "string" ? new Date(data) : data;
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function formatDateInput(data: Date | string | null | undefined): string {
  if (!data) return "";
  const d = typeof data === "string" ? new Date(data) : data;
  const ano = d.getUTCFullYear();
  const mes = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(d.getUTCDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export const LABEL_STATUS_RECEITA: Record<string, string> = {
  RECEBIDO: "Recebido",
  A_RECEBER: "A Receber",
};

export const LABEL_STATUS_DESPESA: Record<string, string> = {
  PAGO: "Pago",
  A_PAGAR: "A Pagar",
};

export const LABEL_RATEIO: Record<string, string> = {
  ESPECIFICA: "Específica",
  TODAS: "Todas",
  NAO_ALOCADA: "Não Alocada",
};

export const MESES_LABEL: Record<string, string> = {
  "01": "Jan",
  "02": "Fev",
  "03": "Mar",
  "04": "Abr",
  "05": "Mai",
  "06": "Jun",
  "07": "Jul",
  "08": "Ago",
  "09": "Set",
  "10": "Out",
  "11": "Nov",
  "12": "Dez",
};

export function formatMesLabel(mes: string): string {
  const [ano, mm] = mes.split("-");
  return `${MESES_LABEL[mm] ?? mm}/${ano.slice(2)}`;
}
