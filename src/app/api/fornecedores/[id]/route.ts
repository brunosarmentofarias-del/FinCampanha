import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fornecedorSchema } from "@/lib/schemas";
import { inferirTipoFornecedor } from "@/lib/documento";
import { comApi } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = comApi(async (req, { params }: Ctx) => {
  const { id } = await params;
  const parsed = fornecedorSchema.partial().safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ erro: parsed.error.flatten() }, { status: 400 });
  }
  // Só recalcula o tipo quando o documento veio na requisição e dá pra reconhecer com
  // confiança (11 ou 14 dígitos); documento ambíguo/vazio não sobrescreve o tipo já salvo.
  const tipoInferido = "documento" in parsed.data ? inferirTipoFornecedor(parsed.data.documento) : null;
  const fornecedor = await prisma.fornecedor.update({
    where: { id },
    data: tipoInferido ? { ...parsed.data, tipo: tipoInferido } : parsed.data,
  });
  return NextResponse.json(fornecedor);
});

export const DELETE = comApi(
  async (_req, { params }: Ctx) => {
    const { id } = await params;
    const despesas = await prisma.despesa.count({ where: { fornecedorId: id } });
    if (despesas > 0) {
      return NextResponse.json(
        { erro: "Não é possível excluir: existem despesas vinculadas a este fornecedor." },
        { status: 409 }
      );
    }
    await prisma.fornecedor.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  },
  { admin: true }
);
