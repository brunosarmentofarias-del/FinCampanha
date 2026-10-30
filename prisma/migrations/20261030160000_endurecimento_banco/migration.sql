-- Papel padrão sem privilégio: quem for criado sem papel explícito vira FINANCEIRO, não ADMIN.
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'FINANCEIRO';

-- Valores monetários: 2 casas decimais (antes DECIMAL(65,30)).
ALTER TABLE "Receita" ALTER COLUMN "valor" TYPE DECIMAL(14,2);
ALTER TABLE "Despesa" ALTER COLUMN "valor" TYPE DECIMAL(14,2);

-- Excluir um cliente nunca deve "soltar" despesas específicas (antes: ON DELETE SET NULL).
ALTER TABLE "Despesa" DROP CONSTRAINT "Despesa_clienteId_fkey";
ALTER TABLE "Despesa" ADD CONSTRAINT "Despesa_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Regras de integridade garantidas pelo próprio banco (antes só no Zod da API).
ALTER TABLE "Receita" ADD CONSTRAINT "Receita_valor_positivo" CHECK ("valor" > 0);
ALTER TABLE "Despesa" ADD CONSTRAINT "Despesa_valor_positivo" CHECK ("valor" > 0);
ALTER TABLE "Receita" ADD CONSTRAINT "Receita_recebido_com_data" CHECK ("status" <> 'RECEBIDO' OR "dataPagamento" IS NOT NULL);
ALTER TABLE "Despesa" ADD CONSTRAINT "Despesa_pago_com_data" CHECK ("status" <> 'PAGO' OR "dataPagamento" IS NOT NULL);
ALTER TABLE "Despesa" ADD CONSTRAINT "Despesa_especifica_com_cliente" CHECK ("rateio" <> 'ESPECIFICA' OR "clienteId" IS NOT NULL);
ALTER TABLE "Despesa" ADD CONSTRAINT "Despesa_cliente_so_se_especifica" CHECK ("rateio" = 'ESPECIFICA' OR "clienteId" IS NULL);

-- Bloqueio temporário de login por e-mail.
CREATE TABLE "LoginTentativa" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginTentativa_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LoginTentativa_email_createdAt_idx" ON "LoginTentativa"("email", "createdAt");

-- O papel da aplicação (fincampanha_app) precisa operar a tabela nova.
-- Os GRANTs em tabelas existentes e o ALTER DEFAULT PRIVILEGES cobrem o resto.
