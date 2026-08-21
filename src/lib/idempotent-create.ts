import { Prisma } from "@prisma/client";

/**
 * Cria um registro tratando colisão na constraint única de idempotencyKey como sucesso:
 * se duas requisições com a mesma chave chegarem quase juntas (duplo-clique, retry de
 * rede), a que perder a corrida do INSERT busca e devolve o registro que a vencedora
 * criou, em vez de duplicar o lançamento financeiro.
 */
export async function criarIdempotente<T>(
  criar: () => Promise<T>,
  buscarExistente: () => Promise<T | null>,
  idempotencyKey: string | undefined
): Promise<{ registro: T; duplicataEvitada: boolean }> {
  try {
    const registro = await criar();
    return { registro, duplicataEvitada: false };
  } catch (e) {
    const colisaoDeChave =
      idempotencyKey &&
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002" &&
      (e.meta?.target as string[] | undefined)?.includes("idempotencyKey");

    if (colisaoDeChave) {
      const existente = await buscarExistente();
      if (existente) return { registro: existente, duplicataEvitada: true };
    }
    throw e;
  }
}

/**
 * Mesma ideia de criarIdempotente, mas para cadastros (Cliente, Fornecedor, GrupoDespesa)
 * cuja unicidade é pelo campo "nome" em vez de um idempotencyKey dedicado: um duplo-clique
 * ou retry no cadastro devolve o registro já existente em vez de estourar um 500 cru.
 */
export async function criarSemDuplicarNome<T>(
  criar: () => Promise<T>,
  buscarExistente: () => Promise<T | null>
): Promise<{ registro: T; duplicataEvitada: boolean }> {
  try {
    const registro = await criar();
    return { registro, duplicataEvitada: false };
  } catch (e) {
    const colisaoDeNome =
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002" &&
      (e.meta?.target as string[] | undefined)?.includes("nome");

    if (colisaoDeNome) {
      const existente = await buscarExistente();
      if (existente) return { registro: existente, duplicataEvitada: true };
    }
    throw e;
  }
}
