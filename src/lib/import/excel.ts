// Importador de "Resultado_Campanha_2026.xlsx" — parsing puro, sem I/O de banco.
// Todas as funções aqui são testáveis isoladamente (ver excel.test.ts).

import { createHash } from "crypto";
import * as XLSX from "xlsx";

export type StatusReceita = "RECEBIDO" | "A_RECEBER";
export type StatusDespesa = "PAGO" | "A_PAGAR";
export type TipoRateio = "ESPECIFICA" | "TODAS" | "NAO_ALOCADA";

// Mapa configurável: nome completo como aparece na planilha -> chave curta do cliente.
export const CLIENTE_MAP: Record<string, string> = {
  "ELEICOES 2026 - PLINIO VALERIO": "PLINIO",
  "ELEICOES 2026 - GEORGE LINS": "GEORGE",
  "ELEICOES 2026 - ATILA LINS": "ATILA",
  "ELEICOES 2026 - DAVID": "DAVID",
  "ELEICOES 2026 - PAULO PP": "PAULO",
  "PARTIDO NOVO": "PARTIDO NOVO",
};

const PREFIXO_CLIENTE = /^ELEICOES 2026 - /i;

export function normalizarEspacos(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export interface ClienteResolvido {
  key: string;
  nomeCompleto: string;
  desconhecido: boolean;
}

export function resolverClienteKey(raw: string): ClienteResolvido {
  const nomeCompleto = normalizarEspacos(raw);
  const mapeado = CLIENTE_MAP[nomeCompleto];
  if (mapeado) return { key: mapeado, nomeCompleto, desconhecido: false };

  // fallback: remove o prefixo padrão e usa o restante como chave, sinalizando como novo
  const semPrefixo = normalizarEspacos(nomeCompleto.replace(PREFIXO_CLIENTE, ""));
  return { key: semPrefixo || nomeCompleto, nomeCompleto, desconhecido: true };
}

/** Resolve a chave curta de cliente citada na coluna "Campanha" de uma despesa. */
export function resolverCampanhaKey(raw: string): ClienteResolvido | null {
  const nomeCompleto = normalizarEspacos(raw);
  if (!nomeCompleto) return null;
  const conhecida = Object.values(CLIENTE_MAP).find(
    (key) => key.toUpperCase() === nomeCompleto.toUpperCase()
  );
  if (conhecida) return { key: conhecida, nomeCompleto: conhecida, desconhecido: false };
  return { key: nomeCompleto.toUpperCase(), nomeCompleto: nomeCompleto.toUpperCase(), desconhecido: true };
}

const VAZIOS = new Set(["", "—", "-", "–", "n/a", "na"]);

export function parseDataBR(valor: unknown): Date | null {
  if (valor == null) return null;
  if (valor instanceof Date) {
    return new Date(valor.getFullYear(), valor.getMonth(), valor.getDate());
  }
  if (typeof valor === "number") {
    // serial de data do Excel (base 1899-12-30)
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const ms = epoch.getTime() + valor * 86400000;
    const d = new Date(ms);
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }
  const str = normalizarEspacos(String(valor)).toLowerCase();
  if (VAZIOS.has(str)) return null;

  const m = String(valor)
    .trim()
    .match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const dia = Number(dd);
  const mes = Number(mm);
  const ano = Number(yyyy);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  return new Date(ano, mes - 1, dia);
}

export function parseParcela(descricao: string): {
  parcelaNum: number | null;
  parcelaTotal: number | null;
} {
  const m = descricao.match(/(\d+)\s*\/\s*(\d+)/);
  if (!m) return { parcelaNum: null, parcelaTotal: null };
  return { parcelaNum: Number(m[1]), parcelaTotal: Number(m[2]) };
}

// A planilha real pode ter linhas com conteúdo idêntico representando transações
// distintas de verdade (ex.: o mesmo prestador pago duas vezes pelo mesmo valor no
// mesmo mês). O índice de ocorrência (0, 1, 2...) desambigua essas repetições dentro
// de uma mesma importação, mantendo o hash determinístico entre reimportações do
// mesmo arquivo (mesma ordem de linhas -> mesma sequência de ocorrências).
export function hashReceita(
  clienteKey: string,
  descricao: string,
  vencimento: Date,
  valor: number,
  status: StatusReceita,
  ocorrencia = 0
): string {
  const chave = [
    clienteKey.trim().toLowerCase(),
    normalizarEspacos(descricao).toLowerCase(),
    isoDate(vencimento),
    valor.toFixed(2),
    status,
    ocorrencia,
  ].join("|");
  return createHash("sha256").update(chave).digest("hex");
}

export function hashDespesa(
  fornecedorNome: string,
  descricao: string,
  vencimento: Date,
  valor: number,
  status: StatusDespesa,
  ocorrencia = 0
): string {
  const chave = [
    normalizarEspacos(fornecedorNome).toLowerCase(),
    normalizarEspacos(descricao).toLowerCase(),
    isoDate(vencimento),
    valor.toFixed(2),
    status,
    ocorrencia,
  ].join("|");
  return createHash("sha256").update(chave).digest("hex");
}

function isoDate(d: Date): string {
  const ano = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export interface ImportErro {
  aba: "Receitas" | "Despesas";
  linha: number;
  motivo: string;
}

export interface ImportReceitaRow {
  linha: number;
  clienteRaw: string;
  clienteKey: string;
  clienteNomeCompleto: string;
  clienteDesconhecido: boolean;
  descricao: string;
  parcelaNum: number | null;
  parcelaTotal: number | null;
  vencimento: Date;
  dataPagamento: Date | null;
  valor: number;
  status: StatusReceita;
  hash: string;
}

export interface ImportDespesaRow {
  linha: number;
  fornecedorNome: string;
  grupoNome: string;
  descricao: string;
  parcelaNum: number | null;
  parcelaTotal: number | null;
  vencimento: Date;
  dataPagamento: Date | null;
  valor: number;
  status: StatusDespesa;
  rateio: TipoRateio;
  clienteKey: string | null;
  clienteDesconhecido: boolean;
  hash: string;
}

export interface ParseResult {
  receitas: ImportReceitaRow[];
  despesas: ImportDespesaRow[];
  erros: ImportErro[];
  clientesNovos: Set<string>;
}

function lerLinhas(sheet: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: true,
  });
}

function linhaVazia(row: unknown[] | undefined): boolean {
  return !row || row.every((c) => c == null || c === "");
}

function contemTexto(row: unknown[], alvo: string): boolean {
  return row.some(
    (c) => typeof c === "string" && c.toUpperCase().includes(alvo.toUpperCase())
  );
}

const HEADER_ROW_INDEX = 3; // linha 4 (1-indexed) = índice 3
const DATA_START_INDEX = 4; // linha 5 (1-indexed) = índice 4

export function parseReceitasSheet(sheet: XLSX.WorkSheet): {
  linhas: ImportReceitaRow[];
  erros: ImportErro[];
  clientesNovos: Set<string>;
} {
  const rows = lerLinhas(sheet);
  const linhas: ImportReceitaRow[] = [];
  const erros: ImportErro[] = [];
  const clientesNovos = new Set<string>();
  const ocorrencias = new Map<string, number>();

  for (let i = DATA_START_INDEX; i < rows.length; i++) {
    const row = rows[i];
    if (linhaVazia(row)) continue;
    if (contemTexto(row, "TOTAL RECEITAS")) break;

    const linhaNum = i + 1;
    const clienteRaw = String(row[0] ?? "").trim();
    const descricao = normalizarEspacos(String(row[1] ?? ""));
    const vencimento = parseDataBR(row[2]);
    const dataPagamento = parseDataBR(row[3]);
    const valorRaw = row[4];
    const statusRaw = normalizarEspacos(String(row[5] ?? "")).toLowerCase();

    if (!clienteRaw) {
      erros.push({ aba: "Receitas", linha: linhaNum, motivo: "Cliente em branco" });
      continue;
    }
    if (!vencimento) {
      erros.push({ aba: "Receitas", linha: linhaNum, motivo: "Vencimento inválido ou em branco" });
      continue;
    }
    if (typeof valorRaw !== "number" || !(valorRaw > 0)) {
      erros.push({ aba: "Receitas", linha: linhaNum, motivo: "Valor ausente ou não positivo" });
      continue;
    }

    let status: StatusReceita;
    if (statusRaw === "recebido") status = "RECEBIDO";
    else if (statusRaw === "a receber") status = "A_RECEBER";
    else {
      erros.push({
        aba: "Receitas",
        linha: linhaNum,
        motivo: `Status "${row[5]}" não reconhecido — tratado como A Receber`,
      });
      status = "A_RECEBER";
    }
    if (status === "RECEBIDO" && !dataPagamento) {
      erros.push({
        aba: "Receitas",
        linha: linhaNum,
        motivo: "Status Recebido sem Data de Pagamento",
      });
    }

    const { key: clienteKey, nomeCompleto, desconhecido } = resolverClienteKey(clienteRaw);
    if (desconhecido) clientesNovos.add(clienteKey);
    const { parcelaNum, parcelaTotal } = parseParcela(descricao);
    const chaveBase = [clienteKey, descricao, isoDate(vencimento), valorRaw, status].join("|");
    const ocorrencia = ocorrencias.get(chaveBase) ?? 0;
    ocorrencias.set(chaveBase, ocorrencia + 1);
    const hash = hashReceita(clienteKey, descricao, vencimento, valorRaw, status, ocorrencia);

    linhas.push({
      linha: linhaNum,
      clienteRaw,
      clienteKey,
      clienteNomeCompleto: nomeCompleto,
      clienteDesconhecido: desconhecido,
      descricao,
      parcelaNum,
      parcelaTotal,
      vencimento,
      dataPagamento,
      valor: valorRaw,
      status,
      hash,
    });
  }

  return { linhas, erros, clientesNovos };
}

export function parseDespesasSheet(sheet: XLSX.WorkSheet): {
  linhas: ImportDespesaRow[];
  erros: ImportErro[];
  clientesNovos: Set<string>;
} {
  const rows = lerLinhas(sheet);
  const linhas: ImportDespesaRow[] = [];
  const erros: ImportErro[] = [];
  const clientesNovos = new Set<string>();
  const ocorrencias = new Map<string, number>();

  for (let i = DATA_START_INDEX; i < rows.length; i++) {
    const row = rows[i];
    if (linhaVazia(row)) continue;
    if (contemTexto(row, "TOTAL DESPESAS")) break;

    const linhaNum = i + 1;
    const fornecedorNome = normalizarEspacos(String(row[0] ?? ""));
    const grupoNome = normalizarEspacos(String(row[1] ?? ""));
    const descricao = normalizarEspacos(String(row[2] ?? ""));
    const dataVenc = parseDataBR(row[3]);
    const campanhaRaw = normalizarEspacos(String(row[4] ?? ""));
    const statusRaw = normalizarEspacos(String(row[5] ?? "")).toLowerCase();
    const valorRaw = row[6];

    if (!fornecedorNome) {
      erros.push({ aba: "Despesas", linha: linhaNum, motivo: "Fornecedor em branco" });
      continue;
    }
    if (!grupoNome) {
      erros.push({ aba: "Despesas", linha: linhaNum, motivo: "Grupo em branco" });
      continue;
    }
    if (!dataVenc) {
      erros.push({ aba: "Despesas", linha: linhaNum, motivo: "Data/Venc. inválida ou em branco" });
      continue;
    }
    if (typeof valorRaw !== "number" || valorRaw === 0) {
      erros.push({ aba: "Despesas", linha: linhaNum, motivo: "Valor ausente ou zero" });
      continue;
    }

    let status: StatusDespesa;
    if (statusRaw === "pago") status = "PAGO";
    else if (statusRaw === "a pagar") status = "A_PAGAR";
    else {
      erros.push({
        aba: "Despesas",
        linha: linhaNum,
        motivo: `Status "${row[5]}" não reconhecido — tratado como A Pagar`,
      });
      status = "A_PAGAR";
    }

    // A planilha só tem uma coluna de data ("Data / Venc."): quando Pago, ela também
    // representa a data de pagamento; quando A Pagar, é só o vencimento.
    const dataPagamento = status === "PAGO" ? dataVenc : null;

    let rateio: TipoRateio;
    let clienteKey: string | null = null;
    let clienteDesconhecido = false;

    if (campanhaRaw.toUpperCase() === "TODAS") {
      rateio = "TODAS";
    } else if (!campanhaRaw) {
      rateio = "NAO_ALOCADA";
    } else {
      rateio = "ESPECIFICA";
      const resolvido = resolverCampanhaKey(campanhaRaw);
      clienteKey = resolvido?.key ?? null;
      clienteDesconhecido = resolvido?.desconhecido ?? false;
      if (clienteDesconhecido && clienteKey) clientesNovos.add(clienteKey);
    }

    const valorAbs = Math.abs(valorRaw);
    const { parcelaNum, parcelaTotal } = parseParcela(descricao);
    const chaveBase = [fornecedorNome, descricao, isoDate(dataVenc), valorAbs, status].join("|");
    const ocorrencia = ocorrencias.get(chaveBase) ?? 0;
    ocorrencias.set(chaveBase, ocorrencia + 1);
    const hash = hashDespesa(fornecedorNome, descricao, dataVenc, valorAbs, status, ocorrencia);

    linhas.push({
      linha: linhaNum,
      fornecedorNome,
      grupoNome,
      descricao,
      parcelaNum,
      parcelaTotal,
      vencimento: dataVenc,
      dataPagamento,
      valor: valorAbs,
      status,
      rateio,
      clienteKey,
      clienteDesconhecido,
      hash,
    });
  }

  return { linhas, erros, clientesNovos };
}

export function parseWorkbook(buffer: Buffer | ArrayBuffer): ParseResult {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: false });

  const receitasSheet = wb.Sheets["Receitas"];
  const despesasSheet = wb.Sheets["Despesas"];

  const erros: ImportErro[] = [];
  const clientesNovos = new Set<string>();

  let receitas: ImportReceitaRow[] = [];
  let despesas: ImportDespesaRow[] = [];

  if (!receitasSheet) {
    erros.push({ aba: "Receitas", linha: 0, motivo: 'Aba "Receitas" não encontrada no arquivo' });
  } else {
    const r = parseReceitasSheet(receitasSheet);
    receitas = r.linhas;
    erros.push(...r.erros);
    r.clientesNovos.forEach((c) => clientesNovos.add(c));
  }

  if (!despesasSheet) {
    erros.push({ aba: "Despesas", linha: 0, motivo: 'Aba "Despesas" não encontrada no arquivo' });
  } else {
    const d = parseDespesasSheet(despesasSheet);
    despesas = d.linhas;
    erros.push(...d.erros);
    d.clientesNovos.forEach((c) => clientesNovos.add(c));
  }

  return { receitas, despesas, erros, clientesNovos };
}
