import { Prisma } from "@prisma/client";

/**
 * Traduz erros técnicos em respostas HTTP corretas e sem detalhes internos.
 * Devolve null quando o erro não é um dos conhecidos (quem chama responde 500).
 */
export function erroConhecido(e: unknown): { status: number; erro: string } | null {
  if (e instanceof SyntaxError) {
    return { status: 400, erro: "Corpo da requisição inválido (JSON malformado)." };
  }
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2025") return { status: 404, erro: "Registro não encontrado." };
    if (e.code === "P2002") return { status: 409, erro: "Já existe um registro com esse valor." };
    if (e.code === "P2003") {
      return { status: 400, erro: "Referência inválida: o registro relacionado não existe ou está em uso." };
    }
  }
  // Violação de CHECK no Postgres chega como erro "desconhecido" do Prisma (SQLSTATE 23514).
  if (
    e instanceof Prisma.PrismaClientUnknownRequestError &&
    /23514|violates check constraint/i.test(e.message)
  ) {
    return { status: 400, erro: "Os dados violam uma regra de integridade (valor, data de pagamento ou campanha)." };
  }
  // Apagar registro ainda referenciado (FK RESTRICT) também chega como erro "desconhecido".
  if (
    e instanceof Prisma.PrismaClientUnknownRequestError &&
    /23001|23503|violates foreign key|is referenced from table/i.test(e.message)
  ) {
    return { status: 409, erro: "Não é possível concluir: o registro está em uso por outros dados." };
  }
  return null;
}
