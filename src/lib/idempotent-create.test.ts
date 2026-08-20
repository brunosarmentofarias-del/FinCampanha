import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { criarIdempotente } from "./idempotent-create";
import { criarClienteTeste, limparBancoTeste, prepararSchemaTeste } from "./test-db";

// Regressão da auditoria financeira (20/08/2026): duas requisições POST /api/despesas
// com o mesmo payload, disparadas quase ao mesmo tempo (duplo-clique real testado via
// curl em paralelo), criavam DOIS lançamentos idênticos e inflavam o Despesa Total do
// dashboard. Este teste reproduz a corrida diretamente contra um Postgres real para
// provar que o fallback em criarIdempotente() fecha a brecha.

describe("criarIdempotente (integração com Postgres/Neon — corrida de duplo-clique)", () => {
  let prisma: PrismaClient;
  let fornecedorId: string;
  let grupoId: string;

  beforeAll(async () => {
    prepararSchemaTeste();
    prisma = criarClienteTeste();
    await limparBancoTeste(prisma);

    const fornecedor = await prisma.fornecedor.create({ data: { nome: "Fornecedor Teste" } });
    const grupo = await prisma.grupoDespesa.create({ data: { nome: "Grupo Teste" } });
    fornecedorId = fornecedor.id;
    grupoId = grupo.id;
  });

  afterAll(async () => {
    await limparBancoTeste(prisma);
    await prisma?.$disconnect();
  });

  it("duas criações concorrentes com a mesma idempotencyKey resultam em UM único registro", async () => {
    const chave = "chave-duplo-clique-1";
    const dadosDespesa = {
      fornecedorId,
      grupoId,
      descricao: "TESTE CONCORRENCIA",
      vencimento: new Date("2026-09-01"),
      valor: 777,
      status: "A_PAGAR" as const,
      rateio: "TODAS" as const,
      idempotencyKey: chave,
    };

    const criar = () => prisma.despesa.create({ data: dadosDespesa });
    const buscarExistente = () => prisma.despesa.findUnique({ where: { idempotencyKey: chave } });

    const [resultadoA, resultadoB] = await Promise.all([
      criarIdempotente(criar, buscarExistente, chave),
      criarIdempotente(criar, buscarExistente, chave),
    ]);

    expect(resultadoA.registro.id).toBe(resultadoB.registro.id);
    // exatamente uma das duas chamadas deve ter "ganho" a corrida (criado de fato)
    expect([resultadoA.duplicataEvitada, resultadoB.duplicataEvitada].sort()).toEqual([false, true]);

    const todasNoBanco = await prisma.despesa.findMany({ where: { idempotencyKey: chave } });
    expect(todasNoBanco).toHaveLength(1);
  });

  it("chaves diferentes (lançamentos de verdade repetidos) NÃO são deduplicadas", async () => {
    const base = {
      fornecedorId,
      grupoId,
      descricao: "PAGAMENTO REPETIDO DE VERDADE",
      vencimento: new Date("2026-09-05"),
      valor: 250,
      status: "PAGO" as const,
      rateio: "TODAS" as const,
      dataPagamento: new Date("2026-09-05"),
    };

    const r1 = await criarIdempotente(
      () => prisma.despesa.create({ data: { ...base, idempotencyKey: "chave-A" } }),
      () => prisma.despesa.findUnique({ where: { idempotencyKey: "chave-A" } }),
      "chave-A"
    );
    const r2 = await criarIdempotente(
      () => prisma.despesa.create({ data: { ...base, idempotencyKey: "chave-B" } }),
      () => prisma.despesa.findUnique({ where: { idempotencyKey: "chave-B" } }),
      "chave-B"
    );

    expect(r1.registro.id).not.toBe(r2.registro.id);
    expect(r1.duplicataEvitada).toBe(false);
    expect(r2.duplicataEvitada).toBe(false);

    const total = await prisma.despesa.count({ where: { descricao: "PAGAMENTO REPETIDO DE VERDADE" } });
    expect(total).toBe(2);
  });
});
