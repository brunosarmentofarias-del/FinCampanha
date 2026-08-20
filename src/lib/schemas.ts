import { z } from "zod";

export const clienteSchema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório").max(50),
  nomeCompleto: z.string().trim().max(200).nullable().optional(),
  isCandidato: z.boolean().default(true),
  ativo: z.boolean().default(true),
});

// "tipo" não é mais um campo do formulário — é inferido no servidor a partir do
// documento (11 dígitos = CPF/PF, 14 dígitos = CNPJ/PJ). Ver src/lib/documento.ts.
export const fornecedorSchema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório").max(200),
  documento: z.string().trim().max(20).nullable().optional(),
});

export const grupoDespesaSchema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório").max(100),
  cor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Cor deve ser um hexadecimal válido")
    .nullable()
    .optional(),
});

export const receitaSchema = z
  .object({
    clienteId: z.string().min(1, "Cliente é obrigatório"),
    descricao: z.string().trim().min(1, "Descrição é obrigatória").max(300),
    parcelaNum: z.number().int().positive().nullable().optional(),
    parcelaTotal: z.number().int().positive().nullable().optional(),
    vencimento: z.coerce.date(),
    dataPagamento: z.coerce.date().nullable().optional(),
    valor: z.number().positive("Valor deve ser maior que zero"),
    status: z.enum(["RECEBIDO", "A_RECEBER"]),
    // gerada pelo formulário ao abrir o diálogo de criação — evita que um duplo-clique
    // ou retry de rede crie dois lançamentos idênticos (ver auditoria financeira).
    idempotencyKey: z.string().trim().min(1).max(100).optional(),
  })
  .refine((data) => data.status !== "RECEBIDO" || !!data.dataPagamento, {
    message: "Data de pagamento é obrigatória quando o status é Recebido",
    path: ["dataPagamento"],
  });

export const despesaSchema = z
  .object({
    fornecedorId: z.string().min(1, "Fornecedor é obrigatório"),
    grupoId: z.string().min(1, "Grupo é obrigatório"),
    descricao: z.string().trim().min(1, "Descrição é obrigatória").max(300),
    parcelaNum: z.number().int().positive().nullable().optional(),
    parcelaTotal: z.number().int().positive().nullable().optional(),
    vencimento: z.coerce.date(),
    dataPagamento: z.coerce.date().nullable().optional(),
    valor: z.number().positive("Valor deve ser maior que zero"),
    status: z.enum(["PAGO", "A_PAGAR"]),
    rateio: z.enum(["ESPECIFICA", "TODAS", "NAO_ALOCADA"]),
    clienteId: z.string().nullable().optional(),
    // gerada pelo formulário ao abrir o diálogo de criação — evita que um duplo-clique
    // ou retry de rede crie dois lançamentos idênticos (ver auditoria financeira).
    idempotencyKey: z.string().trim().min(1).max(100).optional(),
  })
  .refine((data) => data.status !== "PAGO" || !!data.dataPagamento, {
    message: "Data de pagamento é obrigatória quando o status é Pago",
    path: ["dataPagamento"],
  })
  .refine((data) => data.rateio !== "ESPECIFICA" || !!data.clienteId, {
    message: "Cliente é obrigatório quando o rateio é Específica",
    path: ["clienteId"],
  })
  .refine((data) => data.rateio === "ESPECIFICA" || !data.clienteId, {
    message: "Cliente deve ficar em branco quando o rateio não é Específica",
    path: ["clienteId"],
  });

export const usuarioSchema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório").max(100),
  email: z.string().trim().email("E-mail inválido").max(200),
  senha: z.string().min(8, "Senha deve ter pelo menos 8 caracteres").max(100),
  role: z.enum(["ADMIN", "FINANCEIRO"]),
});

export type ClienteInput = z.infer<typeof clienteSchema>;
export type FornecedorInput = z.infer<typeof fornecedorSchema>;
export type GrupoDespesaInput = z.infer<typeof grupoDespesaSchema>;
export type ReceitaInput = z.infer<typeof receitaSchema>;
export type DespesaInput = z.infer<typeof despesaSchema>;
export type UsuarioInput = z.infer<typeof usuarioSchema>;
