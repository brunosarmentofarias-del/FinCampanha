import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  ids: z.array(z.string()).min(1),
  rateio: z.enum(["ESPECIFICA", "TODAS"]),
  clienteId: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: parsed.error.flatten() }, { status: 400 });
  }
  const { ids, rateio, clienteId } = parsed.data;

  if (rateio === "ESPECIFICA" && !clienteId) {
    return NextResponse.json(
      { erro: "Cliente é obrigatório para rateio Específica" },
      { status: 400 }
    );
  }

  const resultado = await prisma.despesa.updateMany({
    where: { id: { in: ids } },
    data: { rateio, clienteId: rateio === "ESPECIFICA" ? clienteId : null },
  });

  return NextResponse.json({ atualizadas: resultado.count });
}
