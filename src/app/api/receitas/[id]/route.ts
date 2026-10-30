import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { receitaSchema } from "@/lib/schemas";
import { comApi } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = comApi(async (req, { params }: Ctx) => {
  const { id } = await params;
  const parsed = receitaSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ erro: parsed.error.flatten() }, { status: 400 });
  }
  // idempotencyKey só vale na criação: nunca sobrescrever numa edição.
  const receita = await prisma.receita.update({
    where: { id },
    data: { ...parsed.data, idempotencyKey: undefined },
  });
  return NextResponse.json(receita);
});

export const DELETE = comApi(
  async (_req, { params }: Ctx) => {
    const { id } = await params;
    await prisma.receita.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  },
  { admin: true }
);
