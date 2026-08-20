// Reconhecimento automático de tipo (PF/PJ) a partir do CPF/CNPJ — usado tanto no
// formulário (preview em tempo real) quanto na API (fonte da verdade: nunca confia
// só no que o frontend manda, recalcula do documento antes de gravar).

export function apenasDigitos(documento: string | null | undefined): string {
  return (documento ?? "").replace(/\D/g, "");
}

/**
 * 11 dígitos = CPF (Pessoa Física), 14 dígitos = CNPJ (Pessoa Jurídica).
 * Quantidade de dígitos diferente disso é ambígua — devolve null e quem chama decide
 * o fallback (ex.: manter o tipo atual ao editar, ou PF por padrão ao criar).
 */
export function inferirTipoFornecedor(documento: string | null | undefined): "PF" | "PJ" | null {
  const digitos = apenasDigitos(documento);
  if (digitos.length === 11) return "PF";
  if (digitos.length === 14) return "PJ";
  return null;
}
