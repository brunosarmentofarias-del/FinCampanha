import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { comApi } from "@/lib/api";

const baixaSchema = z.object({ dataPagamento: z.coerce.date() });

export const POST = comApi(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const parsed = baixaSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ erro: parsed.error.flatten() }, { status: 400 });
  }
  const receita = await prisma.receita.update({
    where: { id },
    data: { status: "RECEBIDO", dataPagamento: parsed.data.dataPagamento },
  });
  return NextResponse.json(receita);
});
