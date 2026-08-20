import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { despesaSchema } from "@/lib/schemas";
import { requireAdmin } from "@/lib/require-role";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const parsed = despesaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: parsed.error.flatten() }, { status: 400 });
  }
  const despesa = await prisma.despesa.update({
    where: { id },
    data: { ...parsed.data, clienteId: parsed.data.clienteId ?? null },
  });
  return NextResponse.json(despesa);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const bloqueio = await requireAdmin();
  if (bloqueio) return bloqueio;

  const { id } = await params;
  await prisma.despesa.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
