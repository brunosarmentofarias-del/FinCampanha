import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

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
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const senhaValida = await bcrypt.compare(password, user.passwordHash);
        if (!senhaValida) return null;

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
