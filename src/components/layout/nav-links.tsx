"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  Users,
  Truck,
  Tags,
  CalendarRange,
  FileBarChart,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/receitas", label: "Receitas", icon: Wallet },
  { href: "/despesas", label: "Despesas", icon: Receipt },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/fornecedores", label: "Fornecedores", icon: Truck },
  { href: "/grupos", label: "Grupos de Despesa", icon: Tags },
  { href: "/fluxo", label: "Fluxo de Caixa", icon: CalendarRange },
  { href: "/relatorios", label: "Relatórios", icon: FileBarChart },
];

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-0.5 p-2">
      {NAV_LINKS.map(({ href, label, icon: Icon }) => {
        const ativo = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
              ativo
                ? "bg-primary text-primary-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <Icon className={cn("h-4 w-4 shrink-0", ativo ? "text-white" : "text-muted-foreground")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
