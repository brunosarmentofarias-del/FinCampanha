import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { usuarioSchema } from "@/lib/schemas";
import { requireAdmin } from "@/lib/require-role";

export async function GET() {
  const bloqueio = await requireAdmin();
  if (bloqueio) return bloqueio;

  const usuarios = await prisma.user.findMany({
    select: { id: true, nome: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(usuarios);
}

export async function POST(req: NextRequest) {
  const bloqueio = await requireAdmin();
  if (bloqueio) return bloqueio;

  const body = await req.json();
  const parsed = usuarioSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: parsed.error.flatten() }, { status: 400 });
  }

  const existente = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existente) {
    return NextResponse.json({ erro: "Já existe um usuário com esse e-mail" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.senha, 10);
  const usuario = await prisma.user.create({
    data: {
      nome: parsed.data.nome,
      email: parsed.data.email,
      passwordHash,
      role: parsed.data.role,
    },
    select: { id: true, nome: true, email: true, role: true, createdAt: true },
  });

  return NextResponse.json(usuario, { status: 201 });
}
