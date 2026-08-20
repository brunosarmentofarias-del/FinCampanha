import { prisma } from "@/lib/prisma";
import { GruposTable } from "./grupos-table";

export default async function GruposPage() {
  const grupos = await prisma.grupoDespesa.findMany({
    orderBy: { nome: "asc" },
    include: { _count: { select: { despesas: true } } },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Grupos de Despesa</h1>
        <p className="text-sm text-muted-foreground">Categorias usadas para classificar despesas.</p>
      </div>
      <GruposTable grupos={grupos} />
    </div>
  );
}
