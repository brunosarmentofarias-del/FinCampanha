import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ReceitasTable } from "./receitas-table";

export default async function ReceitasPage() {
  const session = await auth();
  const [receitas, clientes] = await Promise.all([
    prisma.receita.findMany({ include: { cliente: true }, orderBy: { vencimento: "asc" } }),
    prisma.cliente.findMany({ orderBy: { nome: "asc" } }),
  ]);

  const linhas = receitas.map((r) => ({
    id: r.id,
    clienteId: r.clienteId,
    clienteNome: r.cliente.nome,
    descricao: r.descricao,
    parcelaNum: r.parcelaNum,
    parcelaTotal: r.parcelaTotal,
    vencimento: r.vencimento.toISOString(),
    dataPagamento: r.dataPagamento?.toISOString() ?? null,
    valor: Number(r.valor),
    status: r.status,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Receitas</h1>
        <p className="text-sm text-muted-foreground">Lançamentos de receita por campanha.</p>
      </div>
      <ReceitasTable
        linhas={linhas}
        clientes={clientes}
        podeExcluir={session?.user?.role === "ADMIN"}
      />
    </div>
  );
}
