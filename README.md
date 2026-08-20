# FinCampanha

SaaS compacto de gestão financeira (BPO) para campanhas eleitorais — multi-campanha, com
importador da planilha `Resultado_Campanha_2026.xlsx`, motor de cálculo 100% derivado (nada é
digitado ou armazenado como agregado) e dashboard executivo.

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4 + shadcn/ui (Base UI)
- Prisma + SQLite em dev — schema compatível com Postgres em produção (troque só o
  `provider` em `prisma/schema.prisma` e a `DATABASE_URL`)
- Recharts para os gráficos
- SheetJS (`xlsx`) para importar a planilha, ExcelJS para exportar relatórios, jsPDF para o PDF
- NextAuth v5 (Credentials) — login único por e-mail/senha
- Vitest para os testes

## Setup

```bash
npm install
cp .env.example .env        # ajuste DATABASE_URL/NEXTAUTH_URL se necessário
npx prisma migrate dev       # cria o dev.db e aplica o schema
npm run db:seed              # cria os 6 grupos padrão + usuário admin
npm run dev
```

O seed cria o usuário `admin@fincampanha.local` / `fincampanha123` (ou as variáveis
`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` do `.env`). Troque a senha após o primeiro login.

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | sobe o servidor de desenvolvimento |
| `npm run build` / `npm start` | build e start de produção |
| `npm test` | roda a suíte de testes (Vitest) uma vez |
| `npm run test:watch` | testes em modo watch |
| `npm run db:seed` | garante os 6 grupos padrão e o usuário admin |
| `npm run db:reset` | reseta o banco de dev (`prisma migrate reset`) |

## Testes

```bash
npm test
```

- `src/lib/calc.test.ts` — testes unitários do motor de cálculo, com um fixture pequeno e
  controlado (não é o dataset da planilha real).
- `src/lib/import/excel.test.ts` — parsing puro do importador (datas, parcelas, rateio, hash de
  idempotência), sem tocar o banco.
- `src/lib/import/service.test.ts` — integração do importador com um SQLite temporário: upsert
  case-insensitive de fornecedor/grupo/cliente, classificação de rateio, modos
  "substituir"/"ignorar duplicados".
- `src/lib/import/golden.test.ts` — teste "dourado": importa a planilha **real** e compara com os
  números de referência do enunciado. Fica `skip` até você colocar o arquivo em
  `fixtures/Resultado_Campanha_2026.xlsx` (veja `fixtures/.gitkeep`). Assim que o arquivo existir,
  o teste roda de verdade — não fabricamos números para simular esse dataset, porque não há como
  reproduzir com fidelidade uma planilha que não está disponível neste ambiente.

## A regra de rateio (`resultadoPorCampanha`)

Esta é a regra mais importante do sistema (`src/lib/calc.ts`). Nenhum valor é digitado — tudo é
derivado dos lançamentos de receita e despesa a cada carregamento de página:

1. `poolTodas` = soma das despesas com rateio `TODAS` (despesas que beneficiam todas as
   campanhas — ex.: consultoria geral, ADS institucional).
2. `baseRateio` = soma do contrato total (`Σ receitas.valor`) apenas dos clientes com
   `isCandidato = true`. Serviços específicos (ex.: "PARTIDO NOVO") não entram nessa base.
3. Para cada cliente:
   - `receita` = soma das receitas daquele cliente.
   - `despesaEspecifica` = soma das despesas com rateio `ESPECIFICA` vinculadas àquele cliente.
   - `rateioTodas` = `isCandidato ? poolTodas × (receita / baseRateio) : 0` — o pool de despesas
     compartilhadas é distribuído proporcionalmente ao tamanho do contrato de cada candidato.
   - `resultado` = `receita − despesaEspecifica − rateioTodas`.
4. Uma linha extra **"Não alocado"** soma as despesas com rateio `NAO_ALOCADA` (despesas sem
   campanha definida — sempre um alerta no dashboard) com resultado negativo.

**Invariante testada:** a soma de todos os `resultado` (incluindo "Não alocado") é sempre igual a
`resultadoProjetado` do resumo executivo (`receitaContratada − despesaTotal`), com tolerância de
R$ 0,01. Isso é verificado tanto no teste com fixture pequeno (`calc.test.ts`) quanto no teste
dourado com a planilha real.

## Importação de Excel

Veja [`docs/IMPORTACAO.md`](docs/IMPORTACAO.md) para o formato aceito, as transformações e as
regras de idempotência.

## Estrutura

```
prisma/schema.prisma       modelo de dados (Cliente, Fornecedor, GrupoDespesa, Receita, Despesa)
prisma/seed.ts             6 grupos padrão + usuário admin
src/lib/calc.ts            motor de cálculo — funções puras, 100% testadas
src/lib/import/excel.ts    parsing puro do Excel (sem I/O de banco)
src/lib/import/service.ts  relatório de dry-run + confirmação (grava no banco)
src/lib/schemas.ts         validação Zod (mesmas regras de integridade do banco)
src/app/(app)/             telas autenticadas: dashboard, receitas, despesas, clientes,
                            fornecedores, grupos, fluxo, importar, relatórios
src/app/api/                rotas REST usadas pelas telas acima
```
