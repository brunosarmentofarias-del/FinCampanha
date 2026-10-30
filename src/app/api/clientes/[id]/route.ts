import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clientePatchSchema } from "@/lib/schemas";
import { comApi } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = comApi(async (req, { params }: Ctx) => {
  const { id } = await params;
  const parsed = clientePatchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ erro: parsed.error.flatten() }, { status: 400 });
  }
  const cliente = await prisma.cliente.update({ where: { id }, data: parsed.data });
  return NextResponse.json(cliente);
});

export const DELETE = comApi(
  async (_req, { params }: Ctx) => {
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
  },
  { admin: true }
);
