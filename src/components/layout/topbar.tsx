import { Suspense } from "react";
import { signOut } from "@/lib/auth";
import { CampaignSelector } from "./campaign-selector";
import { FiltrosPopover } from "./filtros-popover";
import { HelpMenu } from "./help-menu";
import { MobileNav } from "./mobile-nav";
import { NotificationsMenu } from "./notifications-menu";
import { PeriodSelector } from "./period-selector";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import { prisma } from "@/lib/prisma";
import type { AlertasResumo } from "@/lib/data/alerts";

export async function Topbar({
  userEmail,
  userName,
  alertas,
}: {
  userEmail: string | null | undefined;
  userName: string | null | undefined;
  alertas: AlertasResumo;
}) {
  const clientes = await prisma.cliente.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
    select: { id: true, nome: true },
  });

  async function encerrarSessao() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <header className="flex flex-col gap-2 border-b bg-background px-4 py-2.5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <MobileNav />
          <div className="flex items-center gap-2">
            <span className="hidden text-sm font-medium text-muted-foreground sm:inline">
              Campanha:
            </span>
            <Suspense fallback={<div className="h-9 w-[200px]" />}>
              <CampaignSelector clientes={clientes} />
            </Suspense>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <HelpMenu />
          <NotificationsMenu alertas={alertas} />
          <UserMenu
            nome={userName || "Administrador"}
            email={userEmail ?? ""}
            onSignOut={encerrarSessao}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Suspense fallback={null}>
          <PeriodSelector />
          <FiltrosPopover clientes={clientes} />
        </Suspense>
      </div>
    </header>
  );
}
