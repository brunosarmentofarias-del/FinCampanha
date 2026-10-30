import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { comApi } from "@/lib/api";

const schema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
  rateio: z.enum(["ESPECIFICA", "TODAS"]),
  clienteId: z.string().nullable().optional(),
});

export const POST = comApi(async (req) => {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ erro: parsed.error.flatten() }, { status: 400 });
  }
  const { ids, rateio, clienteId } = parsed.data;

  if (rateio === "ESPECIFICA") {
    if (!clienteId) {
      return NextResponse.json({ erro: "Cliente é obrigatório para rateio Específica" }, { status: 400 });
    }
    const cliente = await prisma.cliente.findUnique({ where: { id: clienteId }, select: { id: true } });
    if (!cliente) {
      return NextResponse.json({ erro: "Cliente não encontrado" }, { status: 404 });
    }
  }

  const resultado = await prisma.despesa.updateMany({
    where: { id: { in: ids } },
    data: { rateio, clienteId: rateio === "ESPECIFICA" ? clienteId : null },
  });

  return NextResponse.json({ atualizadas: resultado.count });
});
