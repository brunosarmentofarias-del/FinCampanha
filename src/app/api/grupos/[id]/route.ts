import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { grupoDespesaSchema } from "@/lib/schemas";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const parsed = grupoDespesaSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: parsed.error.flatten() }, { status: 400 });
  }
  const grupo = await prisma.grupoDespesa.update({ where: { id }, data: parsed.data });
  return NextResponse.json(grupo);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
}
