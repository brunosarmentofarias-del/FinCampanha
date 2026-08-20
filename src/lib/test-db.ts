// Utilitário compartilhado pelos testes de integração — todos apontam para o
// branch "test" do Neon (Postgres). Como o schema agora é fixo em postgresql,
// não dá mais para criar um arquivo SQLite descartável por teste; em vez disso,
// cada arquivo de teste limpa o branch compartilhado antes de rodar (o
// `fileParallelism: false` do vitest.config.ts garante que os arquivos não
// rodam ao mesmo tempo, então essa limpeza é segura).

import { execSync } from "child_process";
import path from "path";
import { PrismaClient } from "@prisma/client";

export function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL não definida — configure o branch \"test\" do Neon no .env antes de rodar os testes de integração."
    );
  }
  return url;
}

export function prepararSchemaTeste(): void {
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    cwd: path.resolve(__dirname, "../.."),
    env: { ...process.env, DATABASE_URL: testDatabaseUrl(), DIRECT_URL: testDatabaseUrl() },
    stdio: "pipe",
  });
}

export function criarClienteTeste(): PrismaClient {
  return new PrismaClient({ datasources: { db: { url: testDatabaseUrl() } } });
}

/** Ordem respeita as foreign keys: filhos antes dos pais. */
export async function limparBancoTeste(prisma: PrismaClient): Promise<void> {
  await prisma.despesa.deleteMany({});
  await prisma.receita.deleteMany({});
  await prisma.cliente.deleteMany({});
  await prisma.fornecedor.deleteMany({});
  await prisma.grupoDespesa.deleteMany({});
}
