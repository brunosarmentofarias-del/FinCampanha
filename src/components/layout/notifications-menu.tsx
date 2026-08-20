"use client";

import Link from "next/link";
import { AlertTriangle, Bell, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatCurrency } from "@/lib/format";
import type { AlertasResumo } from "@/lib/data/alerts";

export function NotificationsMenu({ alertas }: { alertas: AlertasResumo }) {
  const total = alertas.naoAlocadasCount;

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="ghost" size="icon" className="relative" />}>
        <Bell className="h-4 w-4" />
        {total > 0 && (
          <Badge className="absolute -right-1 -top-1 h-4 min-w-4 justify-center rounded-full bg-red-600 px-1 text-[10px] text-white hover:bg-red-600">
            {total}
          </Badge>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <p className="mb-1 font-medium">Notificações</p>
        {total === 0 ? (
          <p className="flex items-center gap-1.5 text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Tudo em dia, sem alertas.
          </p>
        ) : (
          <Link
            href="/despesas?rateio=NAO_ALOCADA"
            className="flex items-start gap-2 rounded-md p-1.5 text-sm hover:bg-accent"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              <span className="font-medium">{total} despesa(s) não alocada(s)</span>
              <br />
              <span className="text-muted-foreground">
                {formatCurrency(alertas.naoAlocadasTotal)} sem campanha definida
              </span>
            </span>
          </Link>
        )}
      </PopoverContent>
    </Popover>
  );
}
