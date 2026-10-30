import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { receitaSchema } from "@/lib/schemas";
import { comApi } from "@/lib/api";
import { criarIdempotente } from "@/lib/idempotent-create";

export const GET = comApi(async (req) => {
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
});

export const POST = comApi(async (req) => {
  const parsed = receitaSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ erro: parsed.error.flatten() }, { status: 400 });
  }
  const { registro, duplicataEvitada } = await criarIdempotente(
    () => prisma.receita.create({ data: parsed.data }),
    () =>
      parsed.data.idempotencyKey
        ? prisma.receita.findUnique({ where: { idempotencyKey: parsed.data.idempotencyKey } })
        : Promise.resolve(null),
    parsed.data.idempotencyKey
  );
  return NextResponse.json(registro, { status: duplicataEvitada ? 200 : 201 });
});
