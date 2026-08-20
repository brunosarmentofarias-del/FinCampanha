"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CampaignSelector({
  clientes,
}: {
  clientes: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const atual = searchParams.get("cliente") ?? "todas";

  function onChange(value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "todas") params.delete("cliente");
    else params.set("cliente", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  const nomePorId = new Map(clientes.map((c) => [c.id, c.nome]));

  return (
    <Select value={atual} onValueChange={onChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Todas as campanhas">
          {(value: string) => (value === "todas" ? "Todas as campanhas" : nomePorId.get(value) ?? value)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="todas">Todas as campanhas</SelectItem>
        {clientes.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {c.nome}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
