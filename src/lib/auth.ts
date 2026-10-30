import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// 5 senhas erradas seguidas bloqueiam o e-mail por 15 minutos.
const MAX_FALHAS = 5;
const JANELA_BLOQUEIO_MS = 15 * 60 * 1000;
// Hash descartável (de um valor aleatório) só para igualar o tempo quando o e-mail não existe.
const HASH_FALSO = "$2b$10$..zTrrmGLqVRTJ/9e6Sx1e22nP8j.xGw0zopnlQI1BiygZZu1ySrS";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      authorize: async (credentials) => {
        const emailBruto = credentials?.email;
        const password = credentials?.password;
        if (typeof emailBruto !== "string" || typeof password !== "string") return null;
        const email = emailBruto.trim().toLowerCase().slice(0, 200);

        // Bloqueio temporário por e-mail contra força bruta (ver LoginTentativa no schema).
        const desde = new Date(Date.now() - JANELA_BLOQUEIO_MS);
        const falhasRecentes = await prisma.loginTentativa.count({
          where: { email, createdAt: { gte: desde } },
        });
        if (falhasRecentes >= MAX_FALHAS) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        // Compara mesmo sem usuário, para o tempo de resposta não revelar se o e-mail existe.
        const senhaValida = await bcrypt.compare(password, user?.passwordHash ?? HASH_FALSO);

        if (!user || !senhaValida) {
          await prisma.loginTentativa.create({ data: { email } });
          await prisma.loginTentativa.deleteMany({ where: { createdAt: { lt: desde } } });
          return null;
        }

        await prisma.loginTentativa.deleteMany({ where: { email } });
        return { id: user.id, email: user.email, name: user.nome ?? undefined, role: user.role };
      },
    }),
  ],
  callbacks: {
    // O JWT dura dias; sem esta revalidação, um usuário excluído continuaria logado
    // até o token expirar. Consulta o banco no máximo a cada 5 min por sessão.
    jwt: async ({ token, user }) => {
      if (user) {
        token.role = user.role;
        token.verificadoEm = Date.now();
        return token;
      }
      if (token.sub && Date.now() - (token.verificadoEm ?? 0) > 5 * 60 * 1000) {
        const atual = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { role: true },
        });
        if (!atual) return null;
        token.role = atual.role;
        token.verificadoEm = Date.now();
      }
      return token;
    },
    session: ({ session, token }) => {
      if (session.user && token.sub) session.user.id = token.sub;
      if (session.user && token.role) session.user.role = token.role;
      return session;
    },
  },
});
