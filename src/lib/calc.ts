// Motor de cálculo — funções puras. Nenhum valor agregado é armazenado no banco:
// tudo aqui é derivado a partir dos lançamentos de receita/despesa.

export type StatusReceita = "RECEBIDO" | "A_RECEBER";
export type StatusDespesa = "PAGO" | "A_PAGAR";
export type TipoRateio = "ESPECIFICA" | "TODAS" | "NAO_ALOCADA";

export interface ReceitaCalc {
  id: string;
  clienteId: string;
  clienteNome: string;
  descricao: string;
  vencimento: Date;
  dataPagamento: Date | null;
  valor: number;
  status: StatusReceita;
}

export interface DespesaCalc {
  id: string;
  fornecedorId: string;
  fornecedorNome: string;
  grupoId: string;
  grupoNome: string;
  descricao: string;
  vencimento: Date;
  dataPagamento: Date | null;
  valor: number;
  status: StatusDespesa;
  rateio: TipoRateio;
  clienteId: string | null;
  clienteNome: string | null;
}

export interface ClienteCalc {
  id: string;
  nome: string;
  isCandidato: boolean;
}

export interface GrupoCalc {
  id: string;
  nome: string;
  cor: string | null;
}

// ---------------------------------------------------------------------------
// 1. Resumo executivo
// ---------------------------------------------------------------------------

export interface ResumoExecutivo {
  receitaContratada: number;
  receitaRecebida: number;
  receitaAReceber: number;
  despesaTotal: number;
  despesaPaga: number;
  despesaAPagar: number;
  resultadoProjetado: number;
  margemProjetada: number;
  caixaRealizado: number;
  margemReal: number;
}

const soma = (valores: number[]) => valores.reduce((acc, v) => acc + v, 0);

export function resumoExecutivo(
  receitas: ReceitaCalc[],
  despesas: DespesaCalc[]
): ResumoExecutivo {
  const receitaContratada = soma(receitas.map((r) => r.valor));
  const receitaRecebida = soma(
    receitas.filter((r) => r.status === "RECEBIDO").map((r) => r.valor)
  );
  const receitaAReceber = soma(
    receitas.filter((r) => r.status === "A_RECEBER").map((r) => r.valor)
  );

  const despesaTotal = soma(despesas.map((d) => d.valor));
  const despesaPaga = soma(
    despesas.filter((d) => d.status === "PAGO").map((d) => d.valor)
  );
  const despesaAPagar = soma(
    despesas.filter((d) => d.status === "A_PAGAR").map((d) => d.valor)
  );

  const resultadoProjetado = receitaContratada - despesaTotal;
  const margemProjetada =
    receitaContratada === 0 ? 0 : resultadoProjetado / receitaContratada;
  const caixaRealizado = receitaRecebida - despesaPaga;
  // Margem sobre o que já foi de fato recebido e pago (regime de caixa), ao contrário
  // da margem projetada, que usa receita contratada e despesa total (regime de competência).
  const margemReal = receitaRecebida === 0 ? 0 : caixaRealizado / receitaRecebida;

  return {
    receitaContratada,
    receitaRecebida,
    receitaAReceber,
    despesaTotal,
    despesaPaga,
    despesaAPagar,
    resultadoProjetado,
    margemProjetada,
    caixaRealizado,
    margemReal,
  };
}

/**
 * Mesma forma de ResumoExecutivo, mas escopada a uma única campanha (cliente).
 * Usa a linha já calculada por resultadoPorCampanha() para a despesa "TODAS" rateada
 * (não recalcula o rateio aqui — a proporção depende da base inteira de clientes).
 */
export function resumoPorCliente(
  linha: ResultadoCampanha,
  despesasCliente: DespesaCalc[],
  receitasCliente: ReceitaCalc[]
): ResumoExecutivo {
  const despesaPagaEspecifica = soma(
    despesasCliente.filter((d) => d.status === "PAGO").map((d) => d.valor)
  );
  const despesaAPagarEspecifica = soma(
    despesasCliente.filter((d) => d.status === "A_PAGAR").map((d) => d.valor)
  );
  const receitaRecebida = soma(
    receitasCliente.filter((r) => r.status === "RECEBIDO").map((r) => r.valor)
  );
  const receitaAReceber = soma(
    receitasCliente.filter((r) => r.status === "A_RECEBER").map((r) => r.valor)
  );
  const caixaRealizado = receitaRecebida - despesaPagaEspecifica;

  return {
    receitaContratada: linha.receita,
    receitaRecebida,
    receitaAReceber,
    despesaTotal: linha.despesaEspecifica + linha.rateioTodas,
    despesaPaga: despesaPagaEspecifica,
    despesaAPagar: despesaAPagarEspecifica + linha.rateioTodas,
    resultadoProjetado: linha.resultado,
    margemProjetada: linha.receita === 0 ? 0 : linha.resultado / linha.receita,
    caixaRealizado,
    margemReal: receitaRecebida === 0 ? 0 : caixaRealizado / receitaRecebida,
  };
}

// ---------------------------------------------------------------------------
// 2. Despesas por grupo
// ---------------------------------------------------------------------------

export interface DespesaPorGrupo {
  grupoId: string;
  grupoNome: string;
  cor: string | null;
  pago: number;
  aPagar: number;
  total: number;
  percentualDoTotal: number;
}

export function despesasPorGrupo(
  despesas: DespesaCalc[],
  grupos: GrupoCalc[]
): DespesaPorGrupo[] {
  const despesaTotalGeral = soma(despesas.map((d) => d.valor));

  return grupos.map((grupo) => {
    const doGrupo = despesas.filter((d) => d.grupoId === grupo.id);
    const pago = soma(doGrupo.filter((d) => d.status === "PAGO").map((d) => d.valor));
    const aPagar = soma(
      doGrupo.filter((d) => d.status === "A_PAGAR").map((d) => d.valor)
    );
    const total = pago + aPagar;

    return {
      grupoId: grupo.id,
      grupoNome: grupo.nome,
      cor: grupo.cor,
      pago,
      aPagar,
      total,
      percentualDoTotal: despesaTotalGeral === 0 ? 0 : total / despesaTotalGeral,
    };
  });
}

// ---------------------------------------------------------------------------
// 3. Receita por cliente
// ---------------------------------------------------------------------------

export interface ReceitaPorCliente {
  clienteId: string;
  clienteNome: string;
  recebido: number;
  aReceber: number;
  contratoTotal: number;
  percentualDoTotal: number;
}

export function receitaPorCliente(
  receitas: ReceitaCalc[],
  clientes: ClienteCalc[]
): ReceitaPorCliente[] {
  const receitaTotalGeral = soma(receitas.map((r) => r.valor));

  return clientes.map((cliente) => {
    const doCliente = receitas.filter((r) => r.clienteId === cliente.id);
    const recebido = soma(
      doCliente.filter((r) => r.status === "RECEBIDO").map((r) => r.valor)
    );
    const aReceber = soma(
      doCliente.filter((r) => r.status === "A_RECEBER").map((r) => r.valor)
    );
    const contratoTotal = recebido + aReceber;

    return {
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      recebido,
      aReceber,
      contratoTotal,
      percentualDoTotal: receitaTotalGeral === 0 ? 0 : contratoTotal / receitaTotalGeral,
    };
  });
}

// ---------------------------------------------------------------------------
// 4. Resultado por campanha — regra mais importante do sistema
// ---------------------------------------------------------------------------

export interface ResultadoCampanha {
  clienteId: string | null;
  clienteNome: string;
  receita: number;
  despesaEspecifica: number;
  rateioTodas: number;
  resultado: number;
  // Regime de caixa: só o que já foi de fato recebido/pago. Evita que uma campanha
  // sem nenhum recebimento ainda apareça com margem alta só por ter pouca despesa paga.
  receitaRecebida: number;
  resultadoReal: number;
  margemReal: number | null; // null = sem base (nada recebido ainda) — não é 0%, é "sem dado"
}

export function resultadoPorCampanha(
  receitas: ReceitaCalc[],
  despesas: DespesaCalc[],
  clientes: ClienteCalc[]
): ResultadoCampanha[] {
  const contratoPorCliente = new Map<string, number>();
  const recebidoPorCliente = new Map<string, number>();
  for (const cliente of clientes) {
    const doCliente = receitas.filter((r) => r.clienteId === cliente.id);
    contratoPorCliente.set(cliente.id, soma(doCliente.map((r) => r.valor)));
    recebidoPorCliente.set(
      cliente.id,
      soma(doCliente.filter((r) => r.status === "RECEBIDO").map((r) => r.valor))
    );
  }

  const poolTodas = soma(
    despesas.filter((d) => d.rateio === "TODAS").map((d) => d.valor)
  );
  const poolTodasPago = soma(
    despesas.filter((d) => d.rateio === "TODAS" && d.status === "PAGO").map((d) => d.valor)
  );
  const baseRateio = soma(
    clientes.filter((c) => c.isCandidato).map((c) => contratoPorCliente.get(c.id) ?? 0)
  );
  const baseRateioRecebido = soma(
    clientes.filter((c) => c.isCandidato).map((c) => recebidoPorCliente.get(c.id) ?? 0)
  );

  const linhas: ResultadoCampanha[] = clientes.map((cliente) => {
    const receita = contratoPorCliente.get(cliente.id) ?? 0;
    const receitaRecebida = recebidoPorCliente.get(cliente.id) ?? 0;
    const despesasDoCliente = despesas.filter(
      (d) => d.rateio === "ESPECIFICA" && d.clienteId === cliente.id
    );
    const despesaEspecifica = soma(despesasDoCliente.map((d) => d.valor));
    const despesaEspecificaPaga = soma(
      despesasDoCliente.filter((d) => d.status === "PAGO").map((d) => d.valor)
    );
    const rateioTodas =
      cliente.isCandidato && baseRateio > 0 ? poolTodas * (receita / baseRateio) : 0;
    const rateioTodasPago =
      cliente.isCandidato && baseRateioRecebido > 0
        ? poolTodasPago * (receitaRecebida / baseRateioRecebido)
        : 0;
    const resultado = receita - despesaEspecifica - rateioTodas;
    const resultadoReal = receitaRecebida - despesaEspecificaPaga - rateioTodasPago;
    const margemReal = receitaRecebida > 0 ? resultadoReal / receitaRecebida : null;

    return {
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      receita,
      despesaEspecifica,
      rateioTodas,
      resultado,
      receitaRecebida,
      resultadoReal,
      margemReal,
    };
  });

  const naoAlocado = soma(
    despesas.filter((d) => d.rateio === "NAO_ALOCADA").map((d) => d.valor)
  );
  const naoAlocadoPago = soma(
    despesas.filter((d) => d.rateio === "NAO_ALOCADA" && d.status === "PAGO").map((d) => d.valor)
  );

  linhas.push({
    clienteId: null,
    clienteNome: "Não alocado",
    receita: 0,
    despesaEspecifica: naoAlocado,
    receitaRecebida: 0,
    resultadoReal: -naoAlocadoPago,
    margemReal: null,
    rateioTodas: 0,
    resultado: -naoAlocado,
  });

  return linhas;
}

// ---------------------------------------------------------------------------
// 5. Fluxo por mês (a pagar / a receber) — sempre calculado, nunca hardcodado
// ---------------------------------------------------------------------------

export interface FluxoItem {
  chave: string; // nome do fornecedor (PAGAR) ou cliente (RECEBER)
  valor: number;
}

export interface FluxoMes {
  mes: string; // "YYYY-MM"
  itens: FluxoItem[];
  total: number;
  acumulado: number;
}

function chaveMes(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  return `${ano}-${mes}`;
}

export function fluxoPorMes(
  tipo: "PAGAR" | "RECEBER",
  despesas: DespesaCalc[],
  receitas: ReceitaCalc[]
): FluxoMes[] {
  const grupos = new Map<string, Map<string, number>>();

  if (tipo === "PAGAR") {
    for (const d of despesas) {
      if (d.status !== "A_PAGAR") continue;
      const mes = chaveMes(d.vencimento);
      if (!grupos.has(mes)) grupos.set(mes, new Map());
      const porChave = grupos.get(mes)!;
      porChave.set(d.fornecedorNome, (porChave.get(d.fornecedorNome) ?? 0) + d.valor);
    }
  } else {
    for (const r of receitas) {
      if (r.status !== "A_RECEBER") continue;
      const mes = chaveMes(r.vencimento);
      if (!grupos.has(mes)) grupos.set(mes, new Map());
      const porChave = grupos.get(mes)!;
      porChave.set(r.clienteNome, (porChave.get(r.clienteNome) ?? 0) + r.valor);
    }
  }

  const meses = Array.from(grupos.keys()).sort();
  let acumulado = 0;

  return meses.map((mes) => {
    const porChave = grupos.get(mes)!;
    const itens: FluxoItem[] = Array.from(porChave.entries())
      .map(([chave, valor]) => ({ chave, valor }))
      .sort((a, b) => b.valor - a.valor);
    const total = soma(itens.map((i) => i.valor));
    acumulado += total;

    return { mes, itens, total, acumulado };
  });
}

// ---------------------------------------------------------------------------
// 6. Aging de recebíveis
// ---------------------------------------------------------------------------

export interface AgingBucket {
  label: string;
  valor: number;
  quantidade: number;
}

export interface AgingRecebiveis {
  aVencer: AgingBucket;
  d1_30: AgingBucket;
  d31_60: AgingBucket;
  d61_90: AgingBucket;
  d90mais: AgingBucket;
}

const MS_POR_DIA = 1000 * 60 * 60 * 24;

function diasEntre(referencia: Date, data: Date): number {
  const ref = Date.UTC(referencia.getFullYear(), referencia.getMonth(), referencia.getDate());
  const alvo = Date.UTC(data.getFullYear(), data.getMonth(), data.getDate());
  return Math.floor((ref - alvo) / MS_POR_DIA);
}

export function agingRecebiveis(
  receitas: ReceitaCalc[],
  referencia: Date = new Date()
): AgingRecebiveis {
  const pendentes = receitas.filter((r) => r.status === "A_RECEBER");

  const buckets: AgingRecebiveis = {
    aVencer: { label: "A vencer", valor: 0, quantidade: 0 },
    d1_30: { label: "1-30 dias", valor: 0, quantidade: 0 },
    d31_60: { label: "31-60 dias", valor: 0, quantidade: 0 },
    d61_90: { label: "61-90 dias", valor: 0, quantidade: 0 },
    d90mais: { label: "90+ dias", valor: 0, quantidade: 0 },
  };

  for (const r of pendentes) {
    const atraso = diasEntre(referencia, r.vencimento);
    let bucket: AgingBucket;
    if (atraso <= 0) bucket = buckets.aVencer;
    else if (atraso <= 30) bucket = buckets.d1_30;
    else if (atraso <= 60) bucket = buckets.d31_60;
    else if (atraso <= 90) bucket = buckets.d61_90;
    else bucket = buckets.d90mais;

    bucket.valor += r.valor;
    bucket.quantidade += 1;
  }

  return buckets;
}

// ---------------------------------------------------------------------------
// 7. Ranking de fornecedores
// ---------------------------------------------------------------------------

export interface RankingFornecedor {
  fornecedorId: string;
  fornecedorNome: string;
  pago: number;
  aPagar: number;
  total: number;
}

export function rankingFornecedores(
  despesas: DespesaCalc[],
  topN = 10
): RankingFornecedor[] {
  const porFornecedor = new Map<string, RankingFornecedor>();

  for (const d of despesas) {
    const atual = porFornecedor.get(d.fornecedorId) ?? {
      fornecedorId: d.fornecedorId,
      fornecedorNome: d.fornecedorNome,
      pago: 0,
      aPagar: 0,
      total: 0,
    };
    if (d.status === "PAGO") atual.pago += d.valor;
    else atual.aPagar += d.valor;
    atual.total += d.valor;
    porFornecedor.set(d.fornecedorId, atual);
  }

  return Array.from(porFornecedor.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, topN);
}
