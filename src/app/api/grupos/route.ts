import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { grupoDespesaSchema } from "@/lib/schemas";
import { requireAdmin } from "@/lib/require-role";

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
  const grupo = await prisma.grupoDespesa.create({ data: parsed.data });
  return NextResponse.json(grupo, { status: 201 });
}
