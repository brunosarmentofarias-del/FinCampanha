import { Prisma, PrismaClient } from "@prisma/client";
import type { ImportDespesaRow, ImportReceitaRow, ParseResult } from "./excel";

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export interface ImportReportAba {
  total: number;
  novas: number;
  duplicadas: number;
  comErro: number;
  valorTotal: number;
}

export interface ImportReport {
  receitas: ImportReportAba;
  despesas: ImportReportAba;
  clientesNovos: string[];
  fornecedoresNovos: string[];
  gruposNovos: string[];
  naoAlocadas: { linha: number; descricao: string; valor: number }[];
  erros: ParseResult["erros"];
}

function normKey(s: string): string {
  return s.trim().toLowerCase();
}

export async function gerarRelatorioImportacao(
  parsed: ParseResult,
  db: Tx
): Promise<ImportReport> {
  const [clientesExistentes, fornecedoresExistentes, gruposExistentes, hashesReceita, hashesDespesa] =
    await Promise.all([
      db.cliente.findMany({ select: { nome: true } }),
      db.fornecedor.findMany({ select: { nome: true } }),
      db.grupoDespesa.findMany({ select: { nome: true } }),
      db.receita.findMany({ select: { importHash: true }, where: { importHash: { not: null } } }),
      db.despesa.findMany({ select: { importHash: true }, where: { importHash: { not: null } } }),
    ]);

  const clientesSet = new Set(clientesExistentes.map((c) => normKey(c.nome)));
  const fornecedoresSet = new Set(fornecedoresExistentes.map((f) => normKey(f.nome)));
  const gruposSet = new Set(gruposExistentes.map((g) => normKey(g.nome)));
  const hashReceitaSet = new Set(hashesReceita.map((h) => h.importHash!));
  const hashDespesaSet = new Set(hashesDespesa.map((h) => h.importHash!));

  const receitasDuplicadas = parsed.receitas.filter((r) => hashReceitaSet.has(r.hash)).length;
  const despesasDuplicadas = parsed.despesas.filter((d) => hashDespesaSet.has(d.hash)).length;

  const fornecedoresNovos = new Set<string>();
  const gruposNovos = new Set<string>();
  for (const d of parsed.despesas) {
    if (!fornecedoresSet.has(normKey(d.fornecedorNome))) fornecedoresNovos.add(d.fornecedorNome);
    if (!gruposSet.has(normKey(d.grupoNome))) gruposNovos.add(d.grupoNome);
  }

  // clientes novos = qualquer chave referenciada (mapeada ou não) que ainda não existe no banco
  const clientesReferenciados = new Set<string>();
  parsed.receitas.forEach((r) => clientesReferenciados.add(r.clienteKey));
  parsed.despesas.forEach((d) => {
    if (d.clienteKey) clientesReferenciados.add(d.clienteKey);
  });
  const clientesNovos = new Set<string>();
  for (const key of clientesReferenciados) {
    if (!clientesSet.has(normKey(key))) clientesNovos.add(key);
  }

  const naoAlocadas = parsed.despesas
    .filter((d) => d.rateio === "NAO_ALOCADA")
    .map((d) => ({ linha: d.linha, descricao: d.descricao, valor: d.valor }));

  return {
    receitas: {
      total: parsed.receitas.length,
      novas: parsed.receitas.length - receitasDuplicadas,
      duplicadas: receitasDuplicadas,
      comErro: parsed.erros.filter((e) => e.aba === "Receitas").length,
      valorTotal: parsed.receitas.reduce((acc, r) => acc + r.valor, 0),
    },
    despesas: {
      total: parsed.despesas.length,
      novas: parsed.despesas.length - despesasDuplicadas,
      duplicadas: despesasDuplicadas,
      comErro: parsed.erros.filter((e) => e.aba === "Despesas").length,
      valorTotal: parsed.despesas.reduce((acc, d) => acc + d.valor, 0),
    },
    clientesNovos: Array.from(clientesNovos),
    fornecedoresNovos: Array.from(fornecedoresNovos),
    gruposNovos: Array.from(gruposNovos),
    naoAlocadas,
    erros: parsed.erros,
  };
}

export interface ConfirmarImportacaoResult {
  receitasCriadas: number;
  despesasCriadas: number;
  receitasIgnoradas: number;
  despesasIgnoradas: number;
}

export async function confirmarImportacao(
  parsed: ParseResult,
  opts: { modo: "substituir" | "ignorar_duplicados" },
  db: PrismaClient
): Promise<ConfirmarImportacaoResult> {
  return db.$transaction(async (tx) => {
    if (opts.modo === "substituir") {
      await tx.despesa.deleteMany({});
      await tx.receita.deleteMany({});
    }

    // SQLite não suporta filtro case-insensitive no Prisma — pré-carrega tudo e
    // compara em memória (normKey), mantendo o schema compatível com Postgres.
    const [clientesDb, fornecedoresDb, gruposDb] = await Promise.all([
      tx.cliente.findMany(),
      tx.fornecedor.findMany(),
      tx.grupoDespesa.findMany(),
    ]);

    // upsert clientes (por nome/chave curta)
    const clienteIdPorKey = new Map<string, string>();
    for (const c of clientesDb) clienteIdPorKey.set(normKey(c.nome), c.id);

    const todasChaves = new Set<string>();
    parsed.receitas.forEach((r) => todasChaves.add(r.clienteKey));
    parsed.despesas.forEach((d) => {
      if (d.clienteKey) todasChaves.add(d.clienteKey);
    });

    for (const key of todasChaves) {
      const k = normKey(key);
      if (clienteIdPorKey.has(k)) continue;
      const receitaOrigem = parsed.receitas.find((r) => r.clienteKey === key);
      const criado = await tx.cliente.create({
        data: {
          nome: key,
          nomeCompleto: receitaOrigem?.clienteNomeCompleto ?? null,
          isCandidato: key !== "PARTIDO NOVO",
        },
      });
      clienteIdPorKey.set(k, criado.id);
    }

    // upsert fornecedores (case-insensitive, mantém o nome original da 1ª ocorrência)
    const fornecedorIdPorNome = new Map<string, string>();
    for (const f of fornecedoresDb) fornecedorIdPorNome.set(normKey(f.nome), f.id);
    for (const d of parsed.despesas) {
      const k = normKey(d.fornecedorNome);
      if (fornecedorIdPorNome.has(k)) continue;
      const criado = await tx.fornecedor.create({ data: { nome: d.fornecedorNome } });
      fornecedorIdPorNome.set(k, criado.id);
    }

    // upsert grupos
    const grupoIdPorNome = new Map<string, string>();
    for (const g of gruposDb) grupoIdPorNome.set(normKey(g.nome), g.id);
    for (const d of parsed.despesas) {
      const k = normKey(d.grupoNome);
      if (grupoIdPorNome.has(k)) continue;
      const criado = await tx.grupoDespesa.create({ data: { nome: d.grupoNome } });
      grupoIdPorNome.set(k, criado.id);
    }

    let receitasCriadas = 0;
    let receitasIgnoradas = 0;
    for (const r of parsed.receitas) {
      if (opts.modo === "ignorar_duplicados") {
        const dup = await tx.receita.findUnique({ where: { importHash: r.hash } });
        if (dup) {
          receitasIgnoradas++;
          continue;
        }
      }
      await criarReceita(tx, r, clienteIdPorKey.get(normKey(r.clienteKey))!);
      receitasCriadas++;
    }

    let despesasCriadas = 0;
    let despesasIgnoradas = 0;
    for (const d of parsed.despesas) {
      if (opts.modo === "ignorar_duplicados") {
        const dup = await tx.despesa.findUnique({ where: { importHash: d.hash } });
        if (dup) {
          despesasIgnoradas++;
          continue;
        }
      }
      await criarDespesa(
        tx,
        d,
        fornecedorIdPorNome.get(normKey(d.fornecedorNome))!,
        grupoIdPorNome.get(normKey(d.grupoNome))!,
        d.clienteKey ? clienteIdPorKey.get(normKey(d.clienteKey))! : null
      );
      despesasCriadas++;
    }

    return { receitasCriadas, despesasCriadas, receitasIgnoradas, despesasIgnoradas };
    // Um import real cria/atualiza dezenas de linhas em sequência dentro da mesma
    // transação; contra um banco remoto (Neon) a latência de rede acumulada facilmente
    // passa do timeout padrão de 5s do Prisma, então damos bem mais folga aqui.
  }, { timeout: 60000 });
}

async function criarReceita(tx: Tx, r: ImportReceitaRow, clienteId: string) {
  await tx.receita.create({
    data: {
      clienteId,
      descricao: r.descricao,
      parcelaNum: r.parcelaNum,
      parcelaTotal: r.parcelaTotal,
      vencimento: r.vencimento,
      dataPagamento: r.dataPagamento,
      valor: new Prisma.Decimal(r.valor),
      status: r.status,
      importHash: r.hash,
    },
  });
}

async function criarDespesa(
  tx: Tx,
  d: ImportDespesaRow,
  fornecedorId: string,
  grupoId: string,
  clienteId: string | null
) {
  await tx.despesa.create({
    data: {
      fornecedorId,
      grupoId,
      descricao: d.descricao,
      parcelaNum: d.parcelaNum,
      parcelaTotal: d.parcelaTotal,
      vencimento: d.vencimento,
      dataPagamento: d.dataPagamento,
      valor: new Prisma.Decimal(d.valor),
      status: d.status,
      rateio: d.rateio,
      clienteId,
      importHash: d.hash,
    },
  });
}
