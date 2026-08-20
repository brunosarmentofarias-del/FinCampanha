import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UsuariosTable } from "./usuarios-table";

export default async function ConfiguracoesPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const usuarios = await prisma.user.findMany({
    select: { id: true, nome: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie os acessos ao sistema. Contas com o papel <span className="font-medium">Financeiro</span>{" "}
          podem lançar e editar receitas e despesas, mas nunca excluir — exclusão exige um administrador.
        </p>
      </div>
      <UsuariosTable linhas={usuarios} usuarioAtualId={session.user.id!} />
    </div>
  );
}
