import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import {
  hashDespesa,
  hashReceita,
  parseDataBR,
  parseDespesasSheet,
  parseParcela,
  parseReceitasSheet,
  parseWorkbook,
  resolverCampanhaKey,
  resolverClienteKey,
} from "./excel";

describe("parseDataBR", () => {
  it("converte dd/mm/aaaa em Date local", () => {
    const d = parseDataBR("05/03/2026");
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(2);
    expect(d?.getDate()).toBe(5);
  });

  it("trata vazio, '—' e '-' como null", () => {
    expect(parseDataBR("")).toBeNull();
    expect(parseDataBR("—")).toBeNull();
    expect(parseDataBR("-")).toBeNull();
    expect(parseDataBR(null)).toBeNull();
    expect(parseDataBR(undefined)).toBeNull();
  });

  it("aceita um objeto Date diretamente", () => {
    const d = parseDataBR(new Date(2026, 5, 15));
    expect(d?.getMonth()).toBe(5);
    expect(d?.getDate()).toBe(15);
  });

  it("retorna null para texto que não bate com o formato", () => {
    expect(parseDataBR("15-06-2026")).toBeNull();
    expect(parseDataBR("não é data")).toBeNull();
  });
});

describe("parseParcela", () => {
  it("extrai numerador e denominador preservando a descrição original", () => {
    expect(parseParcela("CAMPANHA 2026 - 1/3")).toEqual({ parcelaNum: 1, parcelaTotal: 3 });
    expect(parseParcela("2 / 3 parcelas")).toEqual({ parcelaNum: 2, parcelaTotal: 3 });
  });

  it("retorna nulls quando não há parcela na descrição", () => {
    expect(parseParcela("CAMPANHA 2026")).toEqual({ parcelaNum: null, parcelaTotal: null });
  });
});

describe("resolverClienteKey", () => {
  it("mapeia nomes completos conhecidos para a chave curta", () => {
    expect(resolverClienteKey("ELEICOES 2026 - PLINIO VALERIO")).toEqual({
      key: "PLINIO",
      nomeCompleto: "ELEICOES 2026 - PLINIO VALERIO",
      desconhecido: false,
    });
    expect(resolverClienteKey("PARTIDO NOVO").key).toBe("PARTIDO NOVO");
  });

  it("sinaliza clientes desconhecidos e remove o prefixo padrão", () => {
    const r = resolverClienteKey("ELEICOES 2026 - FULANO DE TAL");
    expect(r.desconhecido).toBe(true);
    expect(r.key).toBe("FULANO DE TAL");
  });

  it("normaliza espaços duplicados", () => {
    const r = resolverClienteKey("  ELEICOES 2026 -   PLINIO VALERIO  ");
    expect(r.key).toBe("PLINIO");
  });
});

describe("resolverCampanhaKey", () => {
  it("reconhece chaves curtas já conhecidas (case-insensitive)", () => {
    expect(resolverCampanhaKey("plinio")?.key).toBe("PLINIO");
  });

  it("retorna null para célula vazia", () => {
    expect(resolverCampanhaKey("")).toBeNull();
  });

  it("sinaliza como desconhecida uma campanha nova", () => {
    const r = resolverCampanhaKey("Fulano");
    expect(r?.desconhecido).toBe(true);
  });
});

describe("hash de idempotência", () => {
  it("é estável para os mesmos dados e ignora maiúsculas/minúsculas e espaços", () => {
    const d = new Date(2026, 0, 10);
    const h1 = hashReceita("PLINIO", "Campanha 2026", d, 1000, "RECEBIDO");
    const h2 = hashReceita(" plinio ", "  campanha   2026 ", d, 1000, "RECEBIDO");
    expect(h1).toBe(h2);
  });

  it("muda quando o valor muda", () => {
    const d = new Date(2026, 0, 10);
    const h1 = hashDespesa("Fornecedor X", "Desc", d, 1000, "PAGO");
    const h2 = hashDespesa("Fornecedor X", "Desc", d, 1000.01, "PAGO");
    expect(h1).not.toBe(h2);
  });

  it("muda quando só o status muda (duas parcelas idênticas, uma já paga e outra não, não podem colidir)", () => {
    const d = new Date(2026, 0, 10);
    const h1 = hashReceita("DAVID", "Campanha 1/2", d, 50000, "RECEBIDO");
    const h2 = hashReceita("DAVID", "Campanha 1/2", d, 50000, "A_RECEBER");
    expect(h1).not.toBe(h2);

    const h3 = hashDespesa("Fornecedor X", "Desc", d, 1000, "PAGO");
    const h4 = hashDespesa("Fornecedor X", "Desc", d, 1000, "A_PAGAR");
    expect(h3).not.toBe(h4);
  });
});

function sheetFromRows(rows: unknown[][]): XLSX.WorkSheet {
  return XLSX.utils.aoa_to_sheet(rows);
}

describe("parseReceitasSheet", () => {
  it("lê a partir da linha 5, ignora a linha de TOTAL e calcula parcelas/status", () => {
    const rows = [
      ["Relatório de campanha"], // 1
      [], // 2
      [], // 3
      ["Cliente", "Descrição", "Vencimento", "Data Pagto", "Valor", "Status"], // 4 header
      ["ELEICOES 2026 - PLINIO VALERIO", "CAMPANHA 2026 - 1/2", "10/01/2026", "10/01/2026", 50000, "Recebido"], // 5
      ["ELEICOES 2026 - PLINIO VALERIO", "CAMPANHA 2026 - 2/2", "10/03/2026", "—", 50000, "A Receber"], // 6
      ["", "TOTAL RECEITAS", "", "", 100000, ""], // 7
    ];
    const { linhas, erros } = parseReceitasSheet(sheetFromRows(rows));
    expect(erros).toHaveLength(0);
    expect(linhas).toHaveLength(2);
    expect(linhas[0].clienteKey).toBe("PLINIO");
    expect(linhas[0].parcelaNum).toBe(1);
    expect(linhas[0].parcelaTotal).toBe(2);
    expect(linhas[0].status).toBe("RECEBIDO");
    expect(linhas[1].status).toBe("A_RECEBER");
    expect(linhas[1].dataPagamento).toBeNull();
  });

  it("gera erro quando Recebido não tem data de pagamento", () => {
    const rows = [
      ["Relatório de campanha"],
      [],
      [],
      ["Cliente", "Descrição", "Vencimento", "Data Pagto", "Valor", "Status"],
      ["PARTIDO NOVO", "Doação", "10/01/2026", "—", 1000, "Recebido"],
    ];
    const { erros } = parseReceitasSheet(sheetFromRows(rows));
    expect(erros.some((e) => e.motivo.includes("sem Data de Pagamento"))).toBe(true);
  });
});

describe("parseDespesasSheet", () => {
  it("aplica Math.abs, classifica rateio e para antes de TOTAL DESPESAS", () => {
    const rows = [
      ["Relatório de campanha"],
      [],
      [],
      ["Fornecedor", "Grupo", "Descrição", "Data/Venc.", "Campanha", "Status", "Valor"],
      ["Gráfica ABC", "Gráfica", "Panfletos", "05/02/2026", "PLINIO", "Pago", -500],
      ["Marketing XYZ", "Marketing", "Ads", "10/02/2026", "TODAS", "A Pagar", -2000],
      ["Buffet Silva", "Alimentação", "Coffee break", "12/02/2026", "", "A Pagar", -300],
      ["", "", "TOTAL DESPESAS", "", "", "", -2800],
    ];
    const { linhas, erros } = parseDespesasSheet(sheetFromRows(rows));
    expect(erros).toHaveLength(0);
    expect(linhas).toHaveLength(3);

    expect(linhas[0].valor).toBe(500);
    expect(linhas[0].rateio).toBe("ESPECIFICA");
    expect(linhas[0].clienteKey).toBe("PLINIO");
    expect(linhas[0].dataPagamento).not.toBeNull(); // Pago -> data/venc. também é data de pagamento

    expect(linhas[1].rateio).toBe("TODAS");
    expect(linhas[1].clienteKey).toBeNull();

    expect(linhas[2].rateio).toBe("NAO_ALOCADA");
    expect(linhas[2].clienteKey).toBeNull();
    expect(linhas[2].dataPagamento).toBeNull(); // A Pagar -> sem data de pagamento
  });

  it("gera hashes distintos para duas linhas idênticas (mesmo prestador pago duas vezes pelo mesmo valor)", () => {
    const rows = [
      ["Relatório de campanha"],
      [],
      [],
      ["Fornecedor", "Grupo", "Descrição", "Data/Venc.", "Campanha", "Status", "Valor"],
      ["Philippe Omena", "Prestadores de Serviço", "Serviços 07/2026", "30/07/2026", "PLINIO", "Pago", -250],
      ["Philippe Omena", "Prestadores de Serviço", "Serviços 07/2026", "30/07/2026", "PLINIO", "Pago", -250],
      ["", "", "TOTAL DESPESAS", "", "", "", -500],
    ];
    const { linhas, erros } = parseDespesasSheet(sheetFromRows(rows));
    expect(erros).toHaveLength(0);
    expect(linhas).toHaveLength(2);
    expect(linhas[0].hash).not.toBe(linhas[1].hash);
  });
});

describe("parseWorkbook", () => {
  it("lê as duas abas de um workbook real gerado via SheetJS", () => {
    const wb = XLSX.utils.book_new();
    const receitasRows = [
      ["Relatório de campanha"],
      [],
      [],
      ["Cliente", "Descrição", "Vencimento", "Data Pagto", "Valor", "Status"],
      ["PARTIDO NOVO", "Cota partidária", "01/01/2026", "01/01/2026", 40000, "Recebido"],
      ["", "TOTAL RECEITAS", "", "", 40000, ""],
    ];
    const despesasRows = [
      ["Relatório de campanha"],
      [],
      [],
      ["Fornecedor", "Grupo", "Descrição", "Data/Venc.", "Campanha", "Status", "Valor"],
      ["Gráfica ABC", "Gráfica", "Panfletos", "05/01/2026", "", "A Pagar", -500],
      ["", "", "TOTAL DESPESAS", "", "", "", -500],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(receitasRows), "Receitas");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(despesasRows), "Despesas");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    const parsed = parseWorkbook(buffer);

    expect(parsed.receitas).toHaveLength(1);
    expect(parsed.despesas).toHaveLength(1);
    expect(parsed.erros).toHaveLength(0);
  });

  it("reporta erro quando uma aba obrigatória não existe", () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["x"]]), "OutraAba");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    const parsed = parseWorkbook(buffer);
    expect(parsed.erros.some((e) => e.motivo.includes("Receitas"))).toBe(true);
    expect(parsed.erros.some((e) => e.motivo.includes("Despesas"))).toBe(true);
  });
});
