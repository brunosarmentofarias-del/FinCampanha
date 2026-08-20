import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clienteSchema } from "@/lib/schemas";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const parsed = clienteSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: parsed.error.flatten() }, { status: 400 });
  }
  const cliente = await prisma.cliente.update({ where: { id }, data: parsed.data });
  return NextResponse.json(cliente);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [receitas, despesas] = await Promise.all([
    prisma.receita.count({ where: { clienteId: id } }),
    prisma.despesa.count({ where: { clienteId: id } }),
  ]);
  if (receitas > 0 || despesas > 0) {
    return NextResponse.json(
      { erro: "Não é possível excluir: existem lançamentos vinculados a este cliente." },
      { status: 409 }
    );
  }
  await prisma.cliente.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
