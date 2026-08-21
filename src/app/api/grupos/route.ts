import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { grupoDespesaSchema } from "@/lib/schemas";
import { requireAdmin } from "@/lib/require-role";
import { criarSemDuplicarNome } from "@/lib/idempotent-create";

export async function GET() {
  const grupos = await prisma.grupoDespesa.findMany({ orderBy: { nome: "asc" } });
  return NextResponse.json(grupos);
}

export async function POST(req: NextRequest) {
  const bloqueio = await requireAdmin();
  if (bloqueio) return bloqueio;

  const body = await req.json();
  const parsed = grupoDespesaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: parsed.error.flatten() }, { status: 400 });
  }
  const { registro, duplicataEvitada } = await criarSemDuplicarNome(
    () => prisma.grupoDespesa.create({ data: parsed.data }),
    () => prisma.grupoDespesa.findUnique({ where: { nome: parsed.data.nome } })
  );
  return NextResponse.json(registro, { status: duplicataEvitada ? 200 : 201 });
}
