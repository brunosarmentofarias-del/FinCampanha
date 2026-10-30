import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { Role } from "@prisma/client";

/**
 * Barreiras de permissão do lado do servidor — a UI esconde botões e o proxy.ts
 * redireciona quem não está logado, mas isso é só conveniência: cada handler confere
 * de novo (via comApi em src/lib/api.ts). Nunca confiar só no frontend nem só no proxy.
 */
export async function requireAuth(): Promise<NextResponse | null> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }
  return null;
}

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
