import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FornecedoresTable } from "./fornecedores-table";

export default async function FornecedoresPage() {
  const session = await auth();
  const fornecedores = await prisma.fornecedor.findMany({
    orderBy: { nome: "asc" },
    include: { _count: { select: { despesas: true } } },
  });

  const totais = await prisma.despesa.groupBy({
    by: ["fornecedorId"],
    _sum: { valor: true },
  });
  const totalPorFornecedor = new Map(totais.map((t) => [t.fornecedorId, Number(t._sum.valor ?? 0)]));

  const linhas = fornecedores.map((f) => ({
    ...f,
    totalDespesas: totalPorFornecedor.get(f.id) ?? 0,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Fornecedores</h1>
        <p className="text-sm text-muted-foreground">Prestadores de serviço e fornecedores da campanha.</p>
      </div>
      <FornecedoresTable linhas={linhas} isAdmin={session?.user?.role === "ADMIN"} />
    </div>
  );
}
