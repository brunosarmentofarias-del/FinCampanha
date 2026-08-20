import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { despesaSchema } from "@/lib/schemas";
import { criarIdempotente } from "@/lib/idempotent-create";

export async function GET(req: NextRequest) {
  const clienteId = req.nextUrl.searchParams.get("cliente");
  const status = req.nextUrl.searchParams.get("status");
  const grupoId = req.nextUrl.searchParams.get("grupo");
  const fornecedorId = req.nextUrl.searchParams.get("fornecedor");
  const rateio = req.nextUrl.searchParams.get("rateio");

  const despesas = await prisma.despesa.findMany({
    where: {
      clienteId: clienteId ?? undefined,
      status: status === "PAGO" || status === "A_PAGAR" ? status : undefined,
      grupoId: grupoId ?? undefined,
      fornecedorId: fornecedorId ?? undefined,
      rateio:
        rateio === "ESPECIFICA" || rateio === "TODAS" || rateio === "NAO_ALOCADA"
          ? rateio
          : undefined,
    },
    include: { fornecedor: true, grupo: true, cliente: true },
    orderBy: { vencimento: "asc" },
  });
  return NextResponse.json(despesas);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = despesaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: parsed.error.flatten() }, { status: 400 });
  }
  const { registro, duplicataEvitada } = await criarIdempotente(
    () => prisma.despesa.create({ data: parsed.data }),
    () =>
      parsed.data.idempotencyKey
        ? prisma.despesa.findUnique({ where: { idempotencyKey: parsed.data.idempotencyKey } })
        : Promise.resolve(null),
    parsed.data.idempotencyKey
  );
  return NextResponse.json(registro, { status: duplicataEvitada ? 200 : 201 });
}
