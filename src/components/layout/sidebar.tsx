import { CircleDollarSign } from "lucide-react";
import { NavLinks } from "./nav-links";

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex items-center gap-2.5 border-b px-4 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <CircleDollarSign className="h-5 w-5" />
        </span>
        <div className="leading-tight">
          <p className="font-heading text-sm font-semibold">FinCampanha</p>
          <p className="text-[11px] text-muted-foreground">Gestão Financeira de Campanhas</p>
        </div>
      </div>

      <NavLinks />

      <div className="border-t p-3">
        <p className="text-center text-[11px] text-muted-foreground">FinCampanha v1.0.0</p>
      </div>
    </aside>
  );
}
