-- CreateEnum
CREATE TYPE "StatusReceita" AS ENUM ('RECEBIDO', 'A_RECEBER');

-- CreateEnum
CREATE TYPE "StatusDespesa" AS ENUM ('PAGO', 'A_PAGAR');

-- CreateEnum
CREATE TYPE "TipoRateio" AS ENUM ('ESPECIFICA', 'TODAS', 'NAO_ALOCADA');

-- CreateEnum
CREATE TYPE "TipoFornecedor" AS ENUM ('PF', 'PJ');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "nomeCompleto" TEXT,
    "isCandidato" BOOLEAN NOT NULL DEFAULT true,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fornecedor" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "documento" TEXT,
    "tipo" "TipoFornecedor" NOT NULL DEFAULT 'PF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fornecedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrupoDespesa" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrupoDespesa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receita" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "parcelaNum" INTEGER,
    "parcelaTotal" INTEGER,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "dataPagamento" TIMESTAMP(3),
    "valor" DECIMAL(65,30) NOT NULL,
    "status" "StatusReceita" NOT NULL,
    "importHash" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Receita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Despesa" (
    "id" TEXT NOT NULL,
    "fornecedorId" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "parcelaNum" INTEGER,
    "parcelaTotal" INTEGER,
    "vencimento" TIMESTAMP(3) NOT NULL,
    "dataPagamento" TIMESTAMP(3),
    "valor" DECIMAL(65,30) NOT NULL,
    "status" "StatusDespesa" NOT NULL,
    "rateio" "TipoRateio" NOT NULL,
    "clienteId" TEXT,
    "importHash" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Despesa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_nome_key" ON "Cliente"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Fornecedor_nome_key" ON "Fornecedor"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "GrupoDespesa_nome_key" ON "GrupoDespesa"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Receita_importHash_key" ON "Receita"("importHash");

-- CreateIndex
CREATE UNIQUE INDEX "Receita_idempotencyKey_key" ON "Receita"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Receita_clienteId_idx" ON "Receita"("clienteId");

-- CreateIndex
CREATE INDEX "Receita_status_idx" ON "Receita"("status");

-- CreateIndex
CREATE INDEX "Receita_vencimento_idx" ON "Receita"("vencimento");

-- CreateIndex
CREATE UNIQUE INDEX "Despesa_importHash_key" ON "Despesa"("importHash");

-- CreateIndex
CREATE UNIQUE INDEX "Despesa_idempotencyKey_key" ON "Despesa"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Despesa_fornecedorId_idx" ON "Despesa"("fornecedorId");

-- CreateIndex
CREATE INDEX "Despesa_grupoId_idx" ON "Despesa"("grupoId");

-- CreateIndex
CREATE INDEX "Despesa_clienteId_idx" ON "Despesa"("clienteId");

-- CreateIndex
CREATE INDEX "Despesa_status_idx" ON "Despesa"("status");

-- CreateIndex
CREATE INDEX "Despesa_rateio_idx" ON "Despesa"("rateio");

-- CreateIndex
CREATE INDEX "Despesa_vencimento_idx" ON "Despesa"("vencimento");

-- AddForeignKey
ALTER TABLE "Receita" ADD CONSTRAINT "Receita_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Despesa" ADD CONSTRAINT "Despesa_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "Fornecedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Despesa" ADD CONSTRAINT "Despesa_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "GrupoDespesa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Despesa" ADD CONSTRAINT "Despesa_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
