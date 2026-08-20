import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-role";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const bloqueio = await requireAdmin();
  if (bloqueio) return bloqueio;

  const { id } = await params;
  const session = await auth();
  if (session?.user?.id === id) {
    return NextResponse.json({ erro: "Você não pode remover o próprio acesso" }, { status: 400 });
  }

  const alvo = await prisma.user.findUnique({ where: { id } });
  if (!alvo) {
    return NextResponse.json({ erro: "Usuário não encontrado" }, { status: 404 });
  }
  if (alvo.role === "ADMIN") {
    const totalAdmins = await prisma.user.count({ where: { role: "ADMIN" } });
    if (totalAdmins <= 1) {
      return NextResponse.json(
        { erro: "Não é possível remover o último administrador" },
        { status: 409 }
      );
    }
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
