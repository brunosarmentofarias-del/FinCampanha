import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { grupoDespesaSchema } from "@/lib/schemas";
import { comApi } from "@/lib/api";
import { criarSemDuplicarNome } from "@/lib/idempotent-create";

export const GET = comApi(async () => {
  const grupos = await prisma.grupoDespesa.findMany({ orderBy: { nome: "asc" } });
  return NextResponse.json(grupos);
});

export const POST = comApi(
  async (req) => {
    const parsed = grupoDespesaSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ erro: parsed.error.flatten() }, { status: 400 });
    }
    const { registro, duplicataEvitada } = await criarSemDuplicarNome(
      () => prisma.grupoDespesa.create({ data: parsed.data }),
      () => prisma.grupoDespesa.findUnique({ where: { nome: parsed.data.nome } })
    );
    return NextResponse.json(registro, { status: duplicataEvitada ? 200 : 201 });
  },
  { admin: true }
);
