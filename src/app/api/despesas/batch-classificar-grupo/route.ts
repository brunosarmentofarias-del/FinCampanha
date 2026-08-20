import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  ids: z.array(z.string()).min(1),
  grupoId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: parsed.error.flatten() }, { status: 400 });
  }
  const { ids, grupoId } = parsed.data;

  const grupo = await prisma.grupoDespesa.findUnique({ where: { id: grupoId } });
  if (!grupo) {
    return NextResponse.json({ erro: "Grupo não encontrado" }, { status: 404 });
  }

  const resultado = await prisma.despesa.updateMany({
    where: { id: { in: ids } },
    data: { grupoId },
  });

  return NextResponse.json({ atualizadas: resultado.count });
}
