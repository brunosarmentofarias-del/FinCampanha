"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/format";
import { calcularIntervalo, PERIODO_LABELS, type PeriodoPreset } from "@/lib/periodo";

export function PeriodSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const atual = (searchParams.get("periodo") as PeriodoPreset | null) ?? "ano";

  function onChange(value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "ano") params.delete("periodo");
    else params.set("periodo", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  const { desde, ate } = calcularIntervalo(atual);

  return (
    <Select value={atual} onValueChange={onChange}>
      <SelectTrigger className="w-auto gap-2">
        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
        <SelectValue>
          {() => (
            <span className="text-xs">
              <span className="text-muted-foreground">Período: </span>
              {desde && ate ? `${formatDate(desde)} a ${formatDate(ate)}` : PERIODO_LABELS[atual]}
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(PERIODO_LABELS).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
