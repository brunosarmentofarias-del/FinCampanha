import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { grupoDespesaSchema } from "@/lib/schemas";
import { comApi } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = comApi(
  async (req, { params }: Ctx) => {
    const { id } = await params;
    const parsed = grupoDespesaSchema.partial().safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ erro: parsed.error.flatten() }, { status: 400 });
    }
    const grupo = await prisma.grupoDespesa.update({ where: { id }, data: parsed.data });
    return NextResponse.json(grupo);
  },
  { admin: true }
);

export const DELETE = comApi(
  async (_req, { params }: Ctx) => {
    const { id } = await params;
    const despesas = await prisma.despesa.count({ where: { grupoId: id } });
    if (despesas > 0) {
      return NextResponse.json(
        { erro: "Não é possível excluir: existem despesas vinculadas a este grupo." },
        { status: 409 }
      );
    }
    await prisma.grupoDespesa.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  },
  { admin: true }
);
