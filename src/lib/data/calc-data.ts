import { prisma } from "@/lib/prisma";
import type { ClienteCalc, DespesaCalc, GrupoCalc, ReceitaCalc } from "@/lib/calc";

export async function getClientesCalc(): Promise<ClienteCalc[]> {
  const clientes = await prisma.cliente.findMany({ orderBy: { nome: "asc" } });
  return clientes.map((c) => ({ id: c.id, nome: c.nome, isCandidato: c.isCandidato }));
}

export async function getGruposCalc(): Promise<GrupoCalc[]> {
  const grupos = await prisma.grupoDespesa.findMany({ orderBy: { nome: "asc" } });
  return grupos.map((g) => ({ id: g.id, nome: g.nome, cor: g.cor }));
}

export async function getReceitasCalc(clienteId?: string | null): Promise<ReceitaCalc[]> {
  const receitas = await prisma.receita.findMany({
    where: clienteId ? { clienteId } : undefined,
    include: { cliente: true },
    orderBy: { vencimento: "asc" },
  });
  return receitas.map((r) => ({
    id: r.id,
    clienteId: r.clienteId,
    clienteNome: r.cliente.nome,
    descricao: r.descricao,
    vencimento: r.vencimento,
    dataPagamento: r.dataPagamento,
    valor: Number(r.valor),
    status: r.status,
  }));
}

export async function getDespesasCalc(clienteId?: string | null): Promise<DespesaCalc[]> {
  const despesas = await prisma.despesa.findMany({
    where: clienteId ? { clienteId } : undefined,
    include: { fornecedor: true, grupo: true, cliente: true },
    orderBy: { vencimento: "asc" },
  });
  return despesas.map((d) => ({
    id: d.id,
    fornecedorId: d.fornecedorId,
    fornecedorNome: d.fornecedor.nome,
    grupoId: d.grupoId,
    grupoNome: d.grupo.nome,
    descricao: d.descricao,
    vencimento: d.vencimento,
    dataPagamento: d.dataPagamento,
    valor: Number(d.valor),
    status: d.status,
    rateio: d.rateio,
    clienteId: d.clienteId,
    clienteNome: d.cliente?.nome ?? null,
  }));
}
