# Auditoria financeira — 2ª rodada (2026-08-20)

Escopo definido pelo usuário: auditar e corrigir **apenas o que já existe hoje no
sistema**. Funcionalidades pedidas no prompt de auditoria mas que não existem no
sistema atual foram propositalmente **não implementadas** — estão listadas na
seção "Fora de escopo" no final deste documento, para não ficarem perdidas.

## 1. Teste principal do sistema (seção 28 do prompt de auditoria)

Cenário exigido: uma campanha com R$1.000.000 contratado, R$600.000 recebido,
R$400.000 a receber, R$400.000 de despesa específica, R$250.000 paga e
R$150.000 a pagar — 10 números exatos esperados.

**Verificado em duas camadas, ambas passando:**

1. **Teste automatizado** (`src/lib/calc.test.ts`, describe "Teste principal do
   sistema (auditoria financeira, seção 28)") — reproduz o cenário com dados
   sintéticos e confere os 10 valores exatos via `resumoExecutivo()`,
   `resultadoPorCampanha()` e `resumoPorCliente()`. 16/16 testes do arquivo
   passando.
2. **Verificação ao vivo, pela API real, contra o banco de produção** — criei
   um cliente de teste ("CAMPANHA TESTE AUDITORIA") com as mesmas receitas e
   despesas via `POST /api/clientes`, `/api/receitas` e `/api/despesas`,
   conferi os números na página `/clientes/[id]` de verdade, e depois apaguei
   tudo e confirmei que `/api/relatorios/data` voltou a bater 100% com o
   estado anterior (baseline capturado antes do teste, diff zero em todos os
   10 campos depois da limpeza).

Resultado da página `/clientes/[id]` para a campanha de teste:

```
Receita Contratada  R$ 1.000.000,00
Receita Recebida    R$   600.000,00
A Receber            R$  400.000,00
Despesa Total         R$ 400.000,00
Resultado Projetado   R$ 600.000,00
Margem Projetada / Real   60,0% / 58,3%
Pago                  R$ 250.000,00
A Pagar                R$ 150.000,00
```

Todos os 10 números batem exatamente com o exigido. O motor de cálculo, a API
e a tela de detalhe da campanha estão consistentes entre si.

## 2. Bugs encontrados e corrigidos

### 2.1 Cálculo duplicado fora de `calc.ts`

Dois lugares faziam sua própria conta em vez de usar as funções centralizadas
de `src/lib/calc.ts` — violando o princípio (já estabelecido na 1ª auditoria)
de que toda margem/total precisa vir de um único lugar:

- **`src/app/(app)/fornecedores/[id]/page.tsx`** — calculava "A pagar" como
  `total - pago` na mão. Agora usa `rankingFornecedores(despesas, Infinity)`,
  a mesma função usada no ranking do dashboard/relatórios.
- **`src/app/(app)/dashboard/page.tsx`** — recalculava o total "Não alocado"
  com `.reduce()` próprio. Agora usa o mesmo valor que já sai da linha "Não
  alocado" de `resultadoPorCampanha()`, a função que já alimenta o gráfico —
  eliminando qualquer risco de os dois números divergirem.

Nenhum dos dois mudava o valor exibido hoje (os dados de produção não expunham
a divergência), mas ambos eram um risco real: bastava um ajuste futuro em
`calc.ts` para os números da tela pararem de bater com o resto do sistema.

### 2.2 Cadastro de Cliente/Fornecedor/Grupo sem proteção contra duplo-clique

`Cliente.nome`, `Fornecedor.nome` e `GrupoDespesa.nome` são `@unique` no
schema, mas as três rotas de criação (`POST /api/clientes`,
`/api/fornecedores`, `/api/grupos`) não tratavam a colisão dessa constraint —
um duplo-clique ou um retry de rede no cadastro estourava um erro 500 cru em
vez de simplesmente devolver o registro já criado, como já acontecia com
despesas/receitas via `idempotencyKey`.

**Corrigido**: adicionada `criarSemDuplicarNome()` em
`src/lib/idempotent-create.ts` (mesmo padrão de `criarIdempotente()`, mas
detectando colisão no campo `nome` em vez de `idempotencyKey`), e as três
rotas passaram a usá-la — agora devolvem o registro existente com status 200
em vez de um 500, sem duplicar o cadastro.

## 3. Verificações que já estavam corretas

- Rateio de despesas "TODAS" sempre soma exatamente o total da despesa entre
  as campanhas ativas (proporcional à receita) — já coberto por teste
  existente, reconferido.
- Nenhuma rota de mutação (`POST`/`PUT`/`PATCH`/`DELETE`) confia no papel
  enviado pelo frontend — todas chamam `requireAdmin()` ou equivalente no
  servidor antes de escrever no banco.
- Exclusão de lançamentos continua restrita a `ADMIN`; o papel `FINANCEIRO`
  segue podendo apenas criar/editar receitas e despesas.
- `financialHealthCheck()` (`src/lib/health-check.ts`) já cobre valor ≤ 0,
  rateio inconsistente, status sem data de pagamento, registros órfãos e
  hash de importação duplicado — nenhuma lacuna nova encontrada aqui.

## 4. Verificação final

- `npx tsc --noEmit` — limpo.
- `npx vitest run` — 49 testes passando, 6 pulados (testes que dependem de
  condição de corrida específica, já marcados como skip antes desta rodada).
- `npm run build` — build de produção limpo, 24 rotas geradas sem erro.
- Deploy feito e confirmado no ar: https://fincampanha.vercel.app (http 200).

## 5. Fora de escopo (pedido no prompt, mas não existe hoje no sistema)

Por instrução explícita do usuário ("desconsidere o que pede e não tem"), os
itens abaixo do prompt de auditoria **não foram implementados**, porque
exigiriam construir entidades/funcionalidades novas do zero:

- Entidade `Contrato` separada (hoje o "contratado" é derivado da soma das
  receitas de cada cliente, não existe um contrato como registro próprio).
- Controle de Orçamento/budget por campanha (limite planejado vs. gasto).
- Entidade `Serviço` separada de `GrupoDespesa`/`Despesa`.
- Papéis adicionais `GESTOR`/`OPERACIONAL` (hoje só existem `ADMIN` e
  `FINANCEIRO`).
- Alertas automáticos (e-mail/notificação) de vencimento ou estouro.
- Tabela formal de log de auditoria (quem alterou o quê e quando) — hoje só
  existem `createdAt`/`updatedAt`.

Nenhum desses foi "esquecido" — estão listados aqui para uma decisão futura
consciente, caso o usuário queira priorizar algum.
