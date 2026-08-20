import { auth } from "@/lib/auth";
import { receitaPorCliente, resultadoPorCampanha } from "@/lib/calc";
import { getClientesCalc, getDespesasCalc, getReceitasCalc } from "@/lib/data/calc-data";
import { prisma } from "@/lib/prisma";
import { ClientesTable } from "./clientes-table";

export default async function ClientesPage() {
  const session = await auth();
  const clientesDb = await prisma.cliente.findMany({ orderBy: { nome: "asc" } });
  const [clientesCalc, receitas, despesas] = await Promise.all([
    getClientesCalc(),
    getReceitasCalc(),
    getDespesasCalc(),
  ]);

  const receitaRows = receitaPorCliente(receitas, clientesCalc);
  const resultadoRows = resultadoPorCampanha(receitas, despesas, clientesCalc);

  const linhas = clientesDb.map((c) => ({
    cliente: c,
    receita: receitaRows.find((r) => r.clienteId === c.id) ?? null,
    resultado: resultadoRows.find((r) => r.clienteId === c.id) ?? null,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Clientes</h1>
          <p className="text-sm text-muted-foreground">Campanhas e serviços específicos, com mini-P&amp;L.</p>
        </div>
      </div>
      <ClientesTable linhas={linhas} isAdmin={session?.user?.role === "ADMIN"} />
    </div>
  );
}
