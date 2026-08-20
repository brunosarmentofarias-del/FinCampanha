import { describe, expect, it } from "vitest";
import { inferirTipoFornecedor } from "./documento";

describe("inferirTipoFornecedor", () => {
  it("reconhece CPF (11 dígitos) como Pessoa Física", () => {
    expect(inferirTipoFornecedor("123.456.789-01")).toBe("PF");
    expect(inferirTipoFornecedor("12345678901")).toBe("PF");
  });

  it("reconhece CNPJ (14 dígitos) como Pessoa Jurídica", () => {
    expect(inferirTipoFornecedor("12.345.678/0001-90")).toBe("PJ");
    expect(inferirTipoFornecedor("12345678000190")).toBe("PJ");
  });

  it("retorna null para vazio ou quantidade de dígitos ambígua", () => {
    expect(inferirTipoFornecedor(null)).toBeNull();
    expect(inferirTipoFornecedor("")).toBeNull();
    expect(inferirTipoFornecedor("123")).toBeNull();
    expect(inferirTipoFornecedor("123456789012")).toBeNull();
  });
});
