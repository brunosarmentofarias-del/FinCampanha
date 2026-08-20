# Importação da planilha

Tela: `/importar`. Rota: `POST /api/import` (dry-run) + `POST /api/import/confirmar` (grava).
Lógica de parsing pura em [`src/lib/import/excel.ts`](../src/lib/import/excel.ts); upsert e
gravação em [`src/lib/import/service.ts`](../src/lib/import/service.ts).

## Formato aceito

O arquivo precisa ter duas abas chamadas exatamente `Receitas` e `Despesas`.

### Aba "Receitas"

Cabeçalho na **linha 4**, dados a partir da **linha 5** até a linha que contiver `TOTAL RECEITAS`
(essa linha e tudo depois dela é ignorado).

| Coluna | Conteúdo | Exemplo |
| --- | --- | --- |
| A | Cliente | `ELEICOES 2026 - PLINIO VALERIO` ou `PARTIDO NOVO` |
| B | Descrição | `CAMPANHA 2026 - 1/3` |
| C | Vencimento | `10/01/2026` |
| D | Data Pagto | `10/01/2026` ou `—` / vazio |
| E | Valor | número positivo |
| F | Status | `Recebido` ou `A Receber` |

### Aba "Despesas"

Cabeçalho na **linha 4**, dados a partir da **linha 5** até a linha que contiver
`TOTAL DESPESAS`.

| Coluna | Conteúdo | Exemplo |
| --- | --- | --- |
| A | Fornecedor / Prestador | `Gráfica Central` |
| B | Grupo | `Gráfica`, `Prestadores de Serviço`, ... |
| C | Descrição | `Panfletos` |
| D | Data / Venc. | `15/01/2026` |
| E | Campanha | `PLINIO`, `TODAS` ou vazio |
| F | Status | `Pago` ou `A Pagar` |
| G | Valor | **negativo** na planilha |

As abas "Resumo Executivo", "Despesas por Grupo", "Por Cliente", "Resultado por Campanha" e
"Fluxo a Pagar por Mês" são derivadas e **ignoradas** na importação — o sistema recalcula tudo a
partir dos lançamentos brutos.

## Transformações aplicadas

1. **Valor de despesa**: `Math.abs()` — a planilha guarda negativo, o banco guarda sempre
   positivo (o sinal vem do tipo do lançamento, não do valor).
2. **Datas**: `dd/mm/aaaa` em texto é convertido para `Date` em fuso local; `—`, `-`, vazio ou
   variações são tratados como `null`. Também aceita células já formatadas como data (objeto
   `Date`) ou serial numérico do Excel, para robustez.
3. **Cliente da receita**: o prefixo `ELEICOES 2026 - ` é removido e o nome é mapeado para a
   chave curta usada no resto do sistema. O mapa fica em `CLIENTE_MAP`
   (`src/lib/import/excel.ts`):

   ```ts
   {
     "ELEICOES 2026 - PLINIO VALERIO": "PLINIO",
     "ELEICOES 2026 - GEORGE LINS": "GEORGE",
     "ELEICOES 2026 - ATILA LINS": "ATILA",
     "ELEICOES 2026 - DAVID": "DAVID",
     "ELEICOES 2026 - PAULO PP": "PAULO",
     "PARTIDO NOVO": "PARTIDO NOVO",
   }
   ```

   Um nome que não está no mapa não falha a importação: vira um cliente novo (a chave é o nome
   sem o prefixo) e é listado em "Clientes novos" no relatório de conferência.
4. **`PARTIDO NOVO`** é criado com `isCandidato = false` — não participa do rateio proporcional
   das despesas `TODAS`.
5. **Coluna Campanha da despesa**:
   - `TODAS` (case-insensitive) → rateio `TODAS`, sem cliente vinculado.
   - vazia → rateio `NAO_ALOCADA`. **Não falha a importação** — a linha é listada no relatório e
     fica visível no dashboard como alerta até alguém classificar (em lote, na tela
     `/despesas`).
   - qualquer outro valor → rateio `ESPECIFICA`, vinculada ao cliente daquela chave (mesma
     lógica de "desconhecido cria registro novo" das receitas).
6. **Parcelas**: a regex `/(\d+)\s*\/\s*(\d+)/` é aplicada sobre a descrição para preencher
   `parcelaNum`/`parcelaTotal`. A descrição original nunca é alterada.
7. **Data de pagamento da despesa**: a planilha só tem **uma** coluna de data para despesas
   ("Data / Venc."). Quando o status é `Pago`, essa data também vira `dataPagamento` (para
   satisfazer a regra de integridade "status Pago exige dataPagamento"); quando `A Pagar`, o
   lançamento fica sem `dataPagamento`.
8. **Fornecedores e grupos**: upsert por nome, com espaços colapsados/trim e comparação
   case-insensitive feita em memória (o SQLite do Prisma não suporta filtro `insensitive`
   nativamente — por isso o service pré-carrega as listas existentes e compara em JS, mantendo
   o schema compatível com Postgres). O nome exibido é o da primeira ocorrência encontrada.
9. **Idempotência**: cada linha recebe um hash SHA-256:
   - Receita: `sha256(clienteKey|descricao|vencimento|valor)`
   - Despesa: `sha256(fornecedorNome|descricao|vencimento|valor)`

   Em uma reimportação, a tela mostra quantas linhas já existem (hash duplicado) e oferece duas
   opções:
   - **Ignorar duplicados**: só grava as linhas cujo hash ainda não existe no banco.
   - **Substituir tudo**: apaga todas as receitas/despesas atuais e recarrega a partir do
     arquivo enviado (fornecedores/clientes/grupos não são apagados).

## Relatório de conferência (dry-run)

Antes de gravar qualquer coisa, `/importar` mostra:

- linhas lidas, novas, duplicadas e com erro, por aba, com o total em R$;
- clientes, fornecedores e grupos que serão criados;
- lançamentos que cairão como "Não Alocada" (sem campanha);
- a lista de erros de parsing por linha (ex.: vencimento inválido, valor ausente) — essas linhas
  simplesmente não entram na importação, o resto do arquivo continua sendo processado.

Nada é gravado até você clicar em "Ignorar duplicados" ou "Substituir tudo e confirmar".

## Testando com a planilha real

Coloque o arquivo original em `fixtures/Resultado_Campanha_2026.xlsx` (a pasta já existe, o
arquivo é ignorado pelo git por conter dados financeiros sensíveis). Com o arquivo presente,
`npm test` ativa `src/lib/import/golden.test.ts`, que importa a planilha para um SQLite
temporário e compara o resultado com os números de referência do enunciado original (tolerância
de R$ 0,01).
