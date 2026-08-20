import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { financialHealthCheck } from "./health-check";
import { criarClienteTeste, limparBancoTeste, prepararSchemaTeste } from "./test-db";

describe("financialHealthCheck (integração com Postgres/Neon)", () => {
  let prisma: PrismaClient;
  let fornecedorId: string;
  let grupoId: string;
  let clienteId: string;

  beforeAll(async () => {
    prepararSchemaTeste();
    prisma = criarClienteTeste();
    await limparBancoTeste(prisma);

    const fornecedor = await prisma.fornecedor.create({ data: { nome: "Fornecedor HC" } });
    const grupo = await prisma.grupoDespesa.create({ data: { nome: "Grupo HC" } });
    const cliente = await prisma.cliente.create({ data: { nome: "CLIENTE_HC" } });
    fornecedorId = fornecedor.id;
    grupoId = grupo.id;
    clienteId = cliente.id;
  });

  afterAll(async () => {
    await limparBancoTeste(prisma);
    await prisma?.$disconnect();
  });

  it("banco íntegro não gera nenhuma ocorrência", async () => {
    await prisma.despesa.create({
      data: {
        fornecedorId,
        grupoId,
        clienteId,
        descricao: "Despesa válida",
        vencimento: new Date("2026-09-01"),
        valor: 100,
        status: "A_PAGAR",
        rateio: "ESPECIFICA",
      },
    });
    await prisma.receita.create({
      data: {
        clienteId,
        descricao: "Receita válida",
        vencimento: new Date("2026-09-01"),
        valor: 200,
        status: "A_RECEBER",
      },
    });

    const ocorrencias = await financialHealthCheck(prisma);
    expect(ocorrencias).toHaveLength(0);

    // limpa para não interferir nos testes seguintes
    await prisma.despesa.deleteMany({});
    await prisma.receita.deleteMany({});
  });

  it("detecta rateio ESPECIFICA sem clienteId (só possível escrevendo direto no banco)", async () => {
    // $executeRaw contorna o Zod/Prisma TS de propósito, simulando um script ou
    // migração de dados que escreva direto no banco sem passar pela API.
    const id = "test-rateio-invalido-1";
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Despesa" (id, "fornecedorId", "grupoId", descricao, vencimento, valor, status, rateio, "clienteId", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'Despesa quebrada', '2026-09-01', '50', 'A_PAGAR', 'ESPECIFICA', NULL, now(), now())`,
      id,
      fornecedorId,
      grupoId
    );

    const ocorrencias = await financialHealthCheck(prisma);
    const achado = ocorrencias.find((o) => o.categoria === "rateio_inconsistente");
    expect(achado).toBeTruthy();
    expect(achado!.severidade).toBe("CRITICO");
    expect(achado!.registros).toContain(id);

    await prisma.$executeRawUnsafe('DELETE FROM "Despesa" WHERE id = $1', id);
  });

  it("detecta status PAGO sem data de pagamento", async () => {
    const id = "test-pago-sem-data-1";
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Despesa" (id, "fornecedorId", "grupoId", descricao, vencimento, "dataPagamento", valor, status, rateio, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'Paga sem data', '2026-09-01', NULL, '50', 'PAGO', 'TODAS', now(), now())`,
      id,
      fornecedorId,
      grupoId
    );

    const ocorrencias = await financialHealthCheck(prisma);
    const achado = ocorrencias.find((o) => o.categoria === "status_sem_data");
    expect(achado).toBeTruthy();
    expect(achado!.registros).toContain(id);

    await prisma.$executeRawUnsafe('DELETE FROM "Despesa" WHERE id = $1', id);
  });

  it("detecta valor <= 0", async () => {
    const id = "test-valor-zero-1";
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Despesa" (id, "fornecedorId", "grupoId", descricao, vencimento, valor, status, rateio, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'Valor zerado', '2026-09-01', '0', 'A_PAGAR', 'TODAS', now(), now())`,
      id,
      fornecedorId,
      grupoId
    );

    const ocorrencias = await financialHealthCheck(prisma);
    const achado = ocorrencias.find((o) => o.categoria === "valor_invalido");
    expect(achado).toBeTruthy();
    expect(achado!.severidade).toBe("CRITICO");
    expect(achado!.registros).toContain(id);

    await prisma.$executeRawUnsafe('DELETE FROM "Despesa" WHERE id = $1', id);
  });
});
