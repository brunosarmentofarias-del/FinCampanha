import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { despesaSchema } from "@/lib/schemas";
import { comApi } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = comApi(async (req, { params }: Ctx) => {
  const { id } = await params;
  const parsed = despesaSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ erro: parsed.error.flatten() }, { status: 400 });
  }
  const despesa = await prisma.despesa.update({
    where: { id },
    // idempotencyKey só vale na criação: nunca sobrescrever numa edição.
    data: { ...parsed.data, clienteId: parsed.data.clienteId ?? null, idempotencyKey: undefined },
  });
  return NextResponse.json(despesa);
});

export const DELETE = comApi(
  async (_req, { params }: Ctx) => {
    const { id } = await params;
    await prisma.despesa.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  },
  { admin: true }
);
