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

  // As regras abaixo agora são garantidas pelo PRÓPRIO BANCO (CHECK na migration
  // 20261030160000_endurecimento_banco): nem um script que escreva direto no banco consegue
  // gravar estes estados. O health-check continua como rede de segurança para dado legado.
  const VIOLACAO = /23514|check constraint/i;

  it("o banco recusa rateio ESPECIFICA sem clienteId", async () => {
    await expect(
      prisma.$executeRawUnsafe(
        `INSERT INTO "Despesa" (id, "fornecedorId", "grupoId", descricao, vencimento, valor, status, rateio, "clienteId", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, 'Despesa quebrada', '2026-09-01', '50', 'A_PAGAR', 'ESPECIFICA', NULL, now(), now())`,
        "test-rateio-invalido-1",
        fornecedorId,
        grupoId
      )
    ).rejects.toThrow(VIOLACAO);
    expect(await financialHealthCheck(prisma)).toHaveLength(0);
  });

  it("o banco recusa rateio TODAS com clienteId", async () => {
    await expect(
      prisma.$executeRawUnsafe(
        `INSERT INTO "Despesa" (id, "fornecedorId", "grupoId", descricao, vencimento, valor, status, rateio, "clienteId", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, 'Despesa quebrada', '2026-09-01', '50', 'A_PAGAR', 'TODAS', $4, now(), now())`,
        "test-rateio-invalido-2",
        fornecedorId,
        grupoId,
        clienteId
      )
    ).rejects.toThrow(VIOLACAO);
  });

  it("o banco recusa status PAGO sem data de pagamento", async () => {
    await expect(
      prisma.$executeRawUnsafe(
        `INSERT INTO "Despesa" (id, "fornecedorId", "grupoId", descricao, vencimento, "dataPagamento", valor, status, rateio, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, 'Paga sem data', '2026-09-01', NULL, '50', 'PAGO', 'TODAS', now(), now())`,
        "test-pago-sem-data-1",
        fornecedorId,
        grupoId
      )
    ).rejects.toThrow(VIOLACAO);
  });

  it("o banco recusa valor <= 0 (despesa e receita)", async () => {
    await expect(
      prisma.$executeRawUnsafe(
        `INSERT INTO "Despesa" (id, "fornecedorId", "grupoId", descricao, vencimento, valor, status, rateio, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, 'Valor zerado', '2026-09-01', '0', 'A_PAGAR', 'TODAS', now(), now())`,
        "test-valor-zero-1",
        fornecedorId,
        grupoId
      )
    ).rejects.toThrow(VIOLACAO);
    await expect(
      prisma.receita.create({
        data: { clienteId, descricao: "Receita negativa", vencimento: new Date("2026-09-01"), valor: -5, status: "A_RECEBER" },
      })
    ).rejects.toThrow();
  });

  it("o banco recusa excluir cliente que ainda tem lançamentos (FK RESTRICT)", async () => {
    await prisma.despesa.create({
      data: {
        fornecedorId,
        grupoId,
        clienteId,
        descricao: "Vinculada",
        vencimento: new Date("2026-09-01"),
        valor: 10,
        status: "A_PAGAR",
        rateio: "ESPECIFICA",
      },
    });
    await expect(prisma.cliente.delete({ where: { id: clienteId } })).rejects.toThrow();
    // a despesa continua específica e ligada ao cliente (antes: o banco anulava o clienteId)
    const despesa = await prisma.despesa.findFirst({ where: { descricao: "Vinculada" } });
    expect(despesa?.clienteId).toBe(clienteId);
    await prisma.despesa.deleteMany({});
  });
});
