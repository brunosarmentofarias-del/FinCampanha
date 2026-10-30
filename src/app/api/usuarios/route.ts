import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { usuarioSchema } from "@/lib/schemas";
import { comApi } from "@/lib/api";

const CAMPOS_PUBLICOS = { id: true, nome: true, email: true, role: true, createdAt: true } as const;

export const GET = comApi(
  async () => {
    const usuarios = await prisma.user.findMany({
      select: CAMPOS_PUBLICOS,
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(usuarios);
  },
  { admin: true }
);

export const POST = comApi(
  async (req) => {
    const parsed = usuarioSchema.safeParse(await req.json());
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
      select: CAMPOS_PUBLICOS,
    });

    return NextResponse.json(usuario, { status: 201 });
  },
  { admin: true }
);
