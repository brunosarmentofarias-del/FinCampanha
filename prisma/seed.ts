import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const GRUPOS_PADRAO = [
  { nome: "Prestadores de Serviço", cor: "#2563eb" },
  { nome: "Marketing / Impulsionamento", cor: "#9333ea" },
  { nome: "Alimentação", cor: "#f59e0b" },
  { nome: "Gráfica", cor: "#0891b2" },
  { nome: "Transporte", cor: "#16a34a" },
  { nome: "Outros", cor: "#64748b" },
];

async function main() {
  for (const grupo of GRUPOS_PADRAO) {
    await prisma.grupoDespesa.upsert({
      where: { nome: grupo.nome },
      update: {},
      create: grupo,
    });
  }

  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const senha = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !senha || senha.length < 12) {
    throw new Error("Defina SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD (mínimo 12 caracteres) no ambiente — não existe senha padrão.");
  }
  const existente = await prisma.user.findUnique({ where: { email } });
  if (!existente) {
    const passwordHash = await bcrypt.hash(senha, 10);
    await prisma.user.create({
      data: { email, passwordHash, nome: "Administrador", role: "ADMIN" },
    });
    console.log(`Usuário admin criado: ${email}`);
  }

  console.log("Seed concluído: 6 grupos de despesa padrão garantidos.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
