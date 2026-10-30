import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname.startsWith("/login");
  const isAuthApi = req.nextUrl.pathname.startsWith("/api/auth");

  if (isAuthApi) return NextResponse.next();

  // API: quem chama espera JSON (e o frontend precisa saber que a sessão caiu), não um redirect pra HTML.
  if (!isLoggedIn && req.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  if (!isLoggedIn && !isLoginPage) {
    const url = new URL("/login", req.nextUrl.origin);
    return NextResponse.redirect(url);
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  // /icon é o favicon gerado dinamicamente (src/app/icon.tsx) — precisa ficar público,
  // senão o navegador nunca consegue buscar o ícone antes do login (ex.: na própria
  // tela de login) e cai de volta no genérico.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon).*)"],
};
