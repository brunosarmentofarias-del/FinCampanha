import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { comApi } from "@/lib/api";

const schema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
  grupoId: z.string().min(1),
});

export const POST = comApi(async (req) => {
  const parsed = schema.safeParse(await req.json());
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
});
