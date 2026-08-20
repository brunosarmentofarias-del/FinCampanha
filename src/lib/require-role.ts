import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { Role } from "@prisma/client";

/**
 * Barreira de permissão do lado do servidor — a UI esconde botões pra quem não é
 * ADMIN, mas isso é só conveniência. Toda rota que exclui algo ou mexe em
 * cliente/fornecedor/grupo/usuário precisa chamar isto: nunca confiar só no frontend.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json(
      { erro: "Apenas administradores podem fazer isso. Peça para um admin autorizar." },
      { status: 403 }
    );
  }
  return null;
}

export function podeExcluir(role: Role | undefined): boolean {
  return role === "ADMIN";
}
