"use client";

import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function HelpMenu() {
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="ghost" size="icon" />}>
        <HelpCircle className="h-4 w-4" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 text-sm">
        <p className="mb-1 font-medium">Como usar o FinCampanha</p>
        <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
          <li>Use o seletor de campanha no topo para ver os números de um cliente específico.</li>
          <li>Despesas sem campanha aparecem como alerta até serem classificadas.</li>
          <li>Nada é digitado nos totais: tudo é recalculado a partir dos lançamentos.</li>
          <li>Cadastre receitas e despesas em Receitas / Despesas.</li>
        </ul>
      </PopoverContent>
    </Popover>
  );
}
