"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ListFilter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PERIODO_LABELS, type PeriodoPreset } from "@/lib/periodo";

export function FiltrosPopover({ clientes }: { clientes: { id: string; nome: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const clienteId = searchParams.get("cliente");
  const periodo = (searchParams.get("periodo") as PeriodoPreset | null) ?? "ano";
  const clienteNome = clienteId ? clientes.find((c) => c.id === clienteId)?.nome : null;

  const ativos = [
    clienteNome ? `Campanha: ${clienteNome}` : null,
    periodo !== "ano" ? `Período: ${PERIODO_LABELS[periodo]}` : null,
  ].filter(Boolean) as string[];

  function limpar() {
    router.push(pathname);
  }

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" size="sm" className="gap-1.5" />}>
        <ListFilter className="h-3.5 w-3.5" />
        Filtros
        {ativos.length > 0 && (
          <Badge variant="secondary" className="ml-0.5 px-1.5">
            {ativos.length}
          </Badge>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 text-sm">
        <p className="mb-2 font-medium">Filtros ativos</p>
        {ativos.length === 0 ? (
          <p className="text-muted-foreground">Nenhum filtro aplicado — exibindo todas as campanhas e todo o período.</p>
        ) : (
          <ul className="space-y-1 text-muted-foreground">
            {ativos.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="mt-3 w-full"
          onClick={limpar}
          disabled={ativos.length === 0}
        >
          Limpar filtros
        </Button>
      </PopoverContent>
    </Popover>
  );
}
