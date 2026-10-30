import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clienteSchema } from "@/lib/schemas";
import { comApi } from "@/lib/api";
import { criarSemDuplicarNome } from "@/lib/idempotent-create";

export const GET = comApi(async () => {
  const clientes = await prisma.cliente.findMany({ orderBy: { nome: "asc" } });
  return NextResponse.json(clientes);
});

export const POST = comApi(async (req) => {
  const parsed = clienteSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ erro: parsed.error.flatten() }, { status: 400 });
  }
  const { registro, duplicataEvitada } = await criarSemDuplicarNome(
    () => prisma.cliente.create({ data: parsed.data }),
    () => prisma.cliente.findUnique({ where: { nome: parsed.data.nome } })
  );
  return NextResponse.json(registro, { status: duplicataEvitada ? 200 : 201 });
});
