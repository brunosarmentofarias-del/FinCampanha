import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.test.ts"],
    // Os testes de integração (import/service, idempotent-create, health-check)
    // compartilham o branch "test" do Neon — arquivos em paralelo poderiam pisar
    // nos dados uns dos outros.
    fileParallelism: false,
    // `prisma db push` contra o Neon é uma chamada de rede real — bem mais lenta
    // que o SQLite local que os testes usavam antes.
    hookTimeout: 30000,
    testTimeout: 15000,
  },
});
