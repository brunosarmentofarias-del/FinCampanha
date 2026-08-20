import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DespesasTable } from "./despesas-table";

export default async function DespesasPage({
  searchParams,
}: {
  searchParams: Promise<{ rateio?: string }>;
}) {
  const { rateio } = await searchParams;
  const session = await auth();

  const [despesas, clientes, fornecedores, grupos] = await Promise.all([
    prisma.despesa.findMany({
      include: { fornecedor: true, grupo: true, cliente: true },
      orderBy: { vencimento: "asc" },
    }),
    prisma.cliente.findMany({ orderBy: { nome: "asc" } }),
    prisma.fornecedor.findMany({ orderBy: { nome: "asc" } }),
    prisma.grupoDespesa.findMany({ orderBy: { nome: "asc" } }),
  ]);

  const linhas = despesas.map((d) => ({
    id: d.id,
    fornecedorId: d.fornecedorId,
    fornecedorNome: d.fornecedor.nome,
    grupoId: d.grupoId,
    grupoNome: d.grupo.nome,
    descricao: d.descricao,
    parcelaNum: d.parcelaNum,
    parcelaTotal: d.parcelaTotal,
    vencimento: d.vencimento.toISOString(),
    dataPagamento: d.dataPagamento?.toISOString() ?? null,
    valor: Number(d.valor),
    status: d.status,
    rateio: d.rateio,
    clienteId: d.clienteId,
    clienteNome: d.cliente?.nome ?? null,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Despesas</h1>
        <p className="text-sm text-muted-foreground">Lançamentos de despesa e classificação de rateio.</p>
      </div>
      <DespesasTable
        linhas={linhas}
        clientes={clientes}
        fornecedores={fornecedores}
        grupos={grupos}
        filtroInicial={rateio}
        podeExcluir={session?.user?.role === "ADMIN"}
      />
    </div>
  );
}
