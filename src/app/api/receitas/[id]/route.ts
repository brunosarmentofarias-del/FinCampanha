import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { receitaSchema } from "@/lib/schemas";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const parsed = receitaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: parsed.error.flatten() }, { status: 400 });
  }
  const receita = await prisma.receita.update({ where: { id }, data: parsed.data });
  return NextResponse.json(receita);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.receita.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
