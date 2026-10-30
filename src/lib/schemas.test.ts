import { describe, expect, it } from "vitest";
import { clientePatchSchema, clienteSchema, usuarioSchema } from "@/lib/schemas";

describe("clientePatchSchema", () => {
  it("PATCH só do nome não inventa isCandidato/ativo (não reseta o que já estava salvo)", () => {
    const r = clientePatchSchema.parse({ nome: "NOVO NOME" });
    expect(r).toEqual({ nome: "NOVO NOME" });
    expect("isCandidato" in r).toBe(false);
    expect("ativo" in r).toBe(false);
  });

  it("PATCH do toggle Candidato não mexe em ativo", () => {
    expect(clientePatchSchema.parse({ isCandidato: false })).toEqual({ isCandidato: false });
  });

  it("criação continua aplicando os padrões (candidato e ativo)", () => {
    const r = clienteSchema.parse({ nome: "X" });
    expect(r.isCandidato).toBe(true);
    expect(r.ativo).toBe(true);
  });
});

describe("usuarioSchema", () => {
  it("normaliza o e-mail para minúsculas", () => {
    const r = usuarioSchema.parse({ nome: "A", email: " Fulano@Exemplo.COM ", senha: "12345678", role: "FINANCEIRO" });
    expect(r.email).toBe("fulano@exemplo.com");
  });

  it("rejeita senha curta e papel desconhecido", () => {
    expect(usuarioSchema.safeParse({ nome: "A", email: "a@b.com", senha: "123", role: "FINANCEIRO" }).success).toBe(false);
    expect(usuarioSchema.safeParse({ nome: "A", email: "a@b.com", senha: "12345678", role: "DONO" }).success).toBe(false);
  });
});
