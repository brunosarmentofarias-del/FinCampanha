export interface RespostaApi {
  ok: boolean;
  status: number;
  data: Record<string, unknown> | null;
  /** Texto pronto para exibir ao usuário quando ok === false. */
  mensagem: string;
}

type ErroZod = { formErrors?: string[]; fieldErrors?: Record<string, string[] | undefined> };

function mensagemDoCorpo(erro: unknown): string | null {
  if (typeof erro === "string") return erro;
  if (erro && typeof erro === "object") {
    const z = erro as ErroZod;
    const geral = z.formErrors?.find(Boolean);
    if (geral) return geral;
    for (const mensagens of Object.values(z.fieldErrors ?? {})) {
      const primeira = mensagens?.find(Boolean);
      if (primeira) return primeira;
    }
  }
  return null;
}

/**
 * Chamada única à API: nunca lança, sempre devolve { ok, status, data, mensagem }.
 * Cobre resposta que não é JSON (ex.: erro do servidor), queda de rede e sessão expirada (401).
 */
export async function chamarApi(
  url: string,
  init: { method?: string; body?: string; headers?: Record<string, string> } = {}
): Promise<RespostaApi> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method ?? "GET",
      headers: init.body !== undefined ? { "Content-Type": "application/json", ...init.headers } : init.headers,
      body: init.body,
    });
  } catch {
    return { ok: false, status: 0, data: null, mensagem: "Sem conexão com o servidor. Verifique a internet e tente de novo." };
  }

  let data: Record<string, unknown> | null = null;
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    // Corpo vazio ou não-JSON: tratado abaixo pelo status.
  }

  if (res.ok) return { ok: true, status: res.status, data, mensagem: "" };

  if (res.status === 401) {
    // Navegação completa (não router.push) de propósito: descarta o estado da tela com sessão caída.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    if (typeof window !== "undefined") window.location.href = "/login";
    return { ok: false, status: 401, data, mensagem: "Sua sessão expirou. Entre novamente." };
  }

  const doCorpo = mensagemDoCorpo(data?.erro);
  const padrao =
    res.status === 403
      ? "Você não tem permissão para isso. Peça para um administrador."
      : res.status >= 500
        ? "Erro no servidor. Tente novamente em instantes."
        : "Não foi possível concluir. Confira os campos.";
  return { ok: false, status: res.status, data, mensagem: doCorpo ?? padrao };
}
