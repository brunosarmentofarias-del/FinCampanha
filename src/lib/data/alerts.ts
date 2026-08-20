import { prisma } from "@/lib/prisma";

export interface AlertasResumo {
  naoAlocadasCount: number;
  naoAlocadasTotal: number;
}

export async function getAlertasResumo(): Promise<AlertasResumo> {
  const naoAlocadas = await prisma.despesa.findMany({
    where: { rateio: "NAO_ALOCADA" },
    select: { valor: true },
  });

  return {
    naoAlocadasCount: naoAlocadas.length,
    naoAlocadasTotal: naoAlocadas.reduce((acc, d) => acc + Number(d.valor), 0),
  };
}
