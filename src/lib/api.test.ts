import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { erroConhecido } from "@/lib/erros-api";

const conhecido = (code: string) =>
  new Prisma.PrismaClientKnownRequestError("falha", { code, clientVersion: "teste" });

describe("erroConhecido (tradução de erros técnicos em HTTP)", () => {
  it("registro inexistente (P2025) vira 404", () => {
    expect(erroConhecido(conhecido("P2025"))?.status).toBe(404);
  });

  it("valor duplicado (P2002) vira 409", () => {
    expect(erroConhecido(conhecido("P2002"))?.status).toBe(409);
  });

  it("referência inválida (P2003) vira 400", () => {
    expect(erroConhecido(conhecido("P2003"))?.status).toBe(400);
  });

  it("JSON malformado vira 400", () => {
    expect(erroConhecido(new SyntaxError("Unexpected token"))?.status).toBe(400);
  });

  it("violação de CHECK do Postgres (erro 'desconhecido' do Prisma) vira 400", () => {
    const e = new Prisma.PrismaClientUnknownRequestError(
      'new row for relation "Despesa" violates check constraint "Despesa_valor_positivo" (23514)',
      { clientVersion: "teste" }
    );
    expect(erroConhecido(e)?.status).toBe(400);
  });

  it("apagar registro ainda referenciado (FK RESTRICT) vira 409", () => {
    const e = new Prisma.PrismaClientUnknownRequestError(
      'update or delete on table "Cliente" violates foreign key constraint "Receita_clienteId_fkey"; Key (id)=(x) is referenced from table "Receita"',
      { clientVersion: "teste" }
    );
    expect(erroConhecido(e)?.status).toBe(409);
  });

  it("erro qualquer não é traduzido (vira 500 genérico, sem vazar detalhes)", () => {
    expect(erroConhecido(new Error("senha do banco: abc"))).toBeNull();
    expect(erroConhecido(conhecido("P1001"))).toBeNull();
  });

  it("mensagens devolvidas nunca carregam o texto técnico original", () => {
    const r = erroConhecido(conhecido("P2002"));
    expect(r?.erro).not.toContain("falha");
  });
});
