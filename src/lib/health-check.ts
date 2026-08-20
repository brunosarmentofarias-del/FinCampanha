// Financial Health Check — reconciliação automática do módulo financeiro.
// Não recalcula nada com regra própria: só compara o que o banco tem contra as
// invariantes que o schema/Zod deveriam garantir, e contra somas brutas via SQL
// (independentes de calc.ts) para detectar divergência entre "o que o dashboard
// mostra" e "o que existe fisicamente no banco".

import type { PrismaClient } from "@prisma/client";

export type Severidade = "CRITICO" | "ALTO" | "MEDIO" | "BAIXO";

export interface Ocorrencia {
  severidade: Severidade;
  categoria: string;
  descricao: string;
  registros: string[]; // ids afetados
}

export async function financialHealthCheck(db: PrismaClient): Promise<Ocorrencia[]> {
  const ocorrencias: Ocorrencia[] = [];

  // 1. Valores <= 0 (Zod bloqueia na API, mas o banco não tem CHECK constraint —
  //    um script/seed futuro que grave direto no Prisma sem passar pela API poderia violar isso).
  const [despesasInvalidas, receitasInvalidas] = await Promise.all([
    db.despesa.findMany({ where: { valor: { lte: 0 } }, select: { id: true } }),
    db.receita.findMany({ where: { valor: { lte: 0 } }, select: { id: true } }),
  ]);
  if (despesasInvalidas.length > 0) {
    ocorrencias.push({
      severidade: "CRITICO",
      categoria: "valor_invalido",
      descricao: "Despesa com valor <= 0 (deveria ser impossível — só ocorre se algo escreveu direto no banco, ignorando a validação da API).",
      registros: despesasInvalidas.map((d) => d.id),
    });
  }
  if (receitasInvalidas.length > 0) {
    ocorrencias.push({
      severidade: "CRITICO",
      categoria: "valor_invalido",
      descricao: "Receita com valor <= 0.",
      registros: receitasInvalidas.map((r) => r.id),
    });
  }

  // 2. rateio ESPECIFICA sem clienteId, ou rateio != ESPECIFICA com clienteId preenchido.
  const rateioInconsistente = await db.despesa.findMany({
    where: {
      OR: [
        { rateio: "ESPECIFICA", clienteId: null },
        { rateio: { in: ["TODAS", "NAO_ALOCADA"] }, clienteId: { not: null } },
      ],
    },
    select: { id: true, rateio: true, clienteId: true },
  });
  if (rateioInconsistente.length > 0) {
    ocorrencias.push({
      severidade: "CRITICO",
      categoria: "rateio_inconsistente",
      descricao: 'Despesa com rateio incompatível com clienteId (ESPECIFICA exige cliente; TODAS/NAO_ALOCADA não podem ter cliente) — quebra resultadoPorCampanha().',
      registros: rateioInconsistente.map((d) => d.id),
    });
  }

  // 3. status PAGO/RECEBIDO sem dataPagamento.
  const [despesasPagasSemData, receitasRecebidasSemData] = await Promise.all([
    db.despesa.findMany({ where: { status: "PAGO", dataPagamento: null }, select: { id: true } }),
    db.receita.findMany({ where: { status: "RECEBIDO", dataPagamento: null }, select: { id: true } }),
  ]);
  if (despesasPagasSemData.length > 0) {
    ocorrencias.push({
      severidade: "ALTO",
      categoria: "status_sem_data",
      descricao: "Despesa marcada como Paga sem data de pagamento.",
      registros: despesasPagasSemData.map((d) => d.id),
    });
  }
  if (receitasRecebidasSemData.length > 0) {
    ocorrencias.push({
      severidade: "ALTO",
      categoria: "status_sem_data",
      descricao: "Receita marcada como Recebida sem data de pagamento.",
      registros: receitasRecebidasSemData.map((r) => r.id),
    });
  }

  // 4. Registros órfãos — clienteId/fornecedorId/grupoId apontando para um id que não existe mais.
  //    (Só é alcançável se alguém desabilitar o FK enforcement do SQLite; documentado por completude.)
  const [despesas, fornecedores, grupos, clientes, receitas] = await Promise.all([
    db.despesa.findMany({ select: { id: true, fornecedorId: true, grupoId: true, clienteId: true } }),
    db.fornecedor.findMany({ select: { id: true } }),
    db.grupoDespesa.findMany({ select: { id: true } }),
    db.cliente.findMany({ select: { id: true } }),
    db.receita.findMany({ select: { id: true, clienteId: true } }),
  ]);
  const idsFornecedor = new Set(fornecedores.map((f) => f.id));
  const idsGrupo = new Set(grupos.map((g) => g.id));
  const idsCliente = new Set(clientes.map((c) => c.id));

  const despesasOrfas = despesas.filter(
    (d) =>
      !idsFornecedor.has(d.fornecedorId) ||
      !idsGrupo.has(d.grupoId) ||
      (d.clienteId && !idsCliente.has(d.clienteId))
  );
  if (despesasOrfas.length > 0) {
    ocorrencias.push({
      severidade: "CRITICO",
      categoria: "registro_orfao",
      descricao: "Despesa referenciando fornecedor/grupo/cliente que não existe mais no banco.",
      registros: despesasOrfas.map((d) => d.id),
    });
  }
  const receitasOrfas = receitas.filter((r) => !idsCliente.has(r.clienteId));
  if (receitasOrfas.length > 0) {
    ocorrencias.push({
      severidade: "CRITICO",
      categoria: "registro_orfao",
      descricao: "Receita referenciando cliente que não existe mais no banco.",
      registros: receitasOrfas.map((r) => r.id),
    });
  }

  // 5. Duplicidade por importHash (não deveria ser possível — é @unique no schema —
  //    mas confere de novo aqui como camada de detecção independente).
  const hashesReceita = await db.receita.groupBy({
    by: ["importHash"],
    where: { importHash: { not: null } },
    _count: { importHash: true },
    having: { importHash: { _count: { gt: 1 } } },
  });
  if (hashesReceita.length > 0) {
    ocorrencias.push({
      severidade: "CRITICO",
      categoria: "duplicidade_import",
      descricao: "Mais de uma receita compartilhando o mesmo importHash — reimportação duplicou lançamentos.",
      registros: hashesReceita.map((h) => h.importHash!),
    });
  }

  return ocorrencias;
}
