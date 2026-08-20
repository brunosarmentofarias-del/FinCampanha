import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { receitaSchema } from "@/lib/schemas";
import { criarIdempotente } from "@/lib/idempotent-create";

export async function GET(req: NextRequest) {
  const clienteId = req.nextUrl.searchParams.get("cliente");
  const status = req.nextUrl.searchParams.get("status");

  const receitas = await prisma.receita.findMany({
    where: {
      clienteId: clienteId ?? undefined,
      status: status === "RECEBIDO" || status === "A_RECEBER" ? status : undefined,
    },
    include: { cliente: true },
    orderBy: { vencimento: "asc" },
  });
  return NextResponse.json(receitas);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = receitaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: parsed.error.flatten() }, { status: 400 });
  }
  const { valor, ...resto } = parsed.data;
  const { registro, duplicataEvitada } = await criarIdempotente(
    () => prisma.receita.create({ data: { ...resto, valor } }),
    () =>
      parsed.data.idempotencyKey
        ? prisma.receita.findUnique({ where: { idempotencyKey: parsed.data.idempotencyKey } })
        : Promise.resolve(null),
    parsed.data.idempotencyKey
  );
  return NextResponse.json(registro, { status: duplicataEvitada ? 200 : 201 });
}
