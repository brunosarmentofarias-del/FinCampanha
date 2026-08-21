import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fornecedorSchema } from "@/lib/schemas";
import { inferirTipoFornecedor } from "@/lib/documento";
import { requireAdmin } from "@/lib/require-role";
import { criarSemDuplicarNome } from "@/lib/idempotent-create";

export async function GET() {
  const fornecedores = await prisma.fornecedor.findMany({ orderBy: { nome: "asc" } });
  return NextResponse.json(fornecedores);
}

export async function POST(req: NextRequest) {
  const bloqueio = await requireAdmin();
  if (bloqueio) return bloqueio;

  const body = await req.json();
  const parsed = fornecedorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: parsed.error.flatten() }, { status: 400 });
  }
  // Tipo nunca vem do cliente — sempre inferido do documento no servidor.
  // Ambíguo (sem documento, ou nem 11 nem 14 dígitos) => PF por padrão na criação.
  const tipo = inferirTipoFornecedor(parsed.data.documento) ?? "PF";
  const { registro, duplicataEvitada } = await criarSemDuplicarNome(
    () => prisma.fornecedor.create({ data: { ...parsed.data, tipo } }),
    () => prisma.fornecedor.findUnique({ where: { nome: parsed.data.nome } })
  );
  return NextResponse.json(registro, { status: duplicataEvitada ? 200 : 201 });
}
