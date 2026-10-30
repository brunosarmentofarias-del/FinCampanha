import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireAuth } from "@/lib/require-role";
import { erroConhecido } from "@/lib/erros-api";

function registrarErro(req: NextRequest, e: unknown) {
  // Sem corpo da requisição no log: pode ter dado pessoal ou financeiro.
  const mensagem = e instanceof Error ? e.message.slice(0, 500) : String(e).slice(0, 500);
  console.error(
    JSON.stringify({ nivel: "erro", rota: req.nextUrl.pathname, metodo: req.method, mensagem })
  );
}

/**
 * Envolve um handler de rota: confere login (ou papel ADMIN) dentro do próprio backend e
 * converte exceções em 400/404/409 quando reconhecidas, senão registra e devolve 500 genérico.
 */
export function comApi<C = unknown>(
  handler: (req: NextRequest, ctx: C) => Promise<Response>,
  opcoes: { admin?: boolean } = {}
) {
  return async (req: NextRequest, ctx: C): Promise<Response> => {
    try {
      const bloqueio = opcoes.admin ? await requireAdmin() : await requireAuth();
      if (bloqueio) return bloqueio;
      return await handler(req, ctx);
    } catch (e) {
      const conhecido = erroConhecido(e);
      if (conhecido) return NextResponse.json({ erro: conhecido.erro }, { status: conhecido.status });
      registrarErro(req, e);
      return NextResponse.json({ erro: "Erro interno. Tente novamente em instantes." }, { status: 500 });
    }
  };
}
