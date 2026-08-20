import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const baixaSchema = z.object({ dataPagamento: z.coerce.date() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const parsed = baixaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: parsed.error.flatten() }, { status: 400 });
  }
  const despesa = await prisma.despesa.update({
    where: { id },
    data: { status: "PAGO", dataPagamento: parsed.data.dataPagamento },
  });
  return NextResponse.json(despesa);
}
