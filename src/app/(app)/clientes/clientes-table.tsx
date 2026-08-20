"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ReceitaPorCliente, ResultadoCampanha } from "@/lib/calc";

interface ClienteRow {
  id: string;
  nome: string;
  nomeCompleto: string | null;
  isCandidato: boolean;
  ativo: boolean;
}

interface Linha {
  cliente: ClienteRow;
  receita: ReceitaPorCliente | null;
  resultado: ResultadoCampanha | null;
}

export function ClientesTable({ linhas, isAdmin = false }: { linhas: Linha[]; isAdmin?: boolean }) {
  const router = useRouter();
  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando] = useState<ClienteRow | null>(null);
  const [salvando, setSalvando] = useState(false);

  function abrirNovo() {
    setEditando(null);
    setDialogAberto(true);
  }

  function abrirEdicao(c: ClienteRow) {
    setEditando(c);
    setDialogAberto(true);
  }

  async function toggleCandidato(c: ClienteRow, valor: boolean) {
    const res = await fetch(`/api/clientes/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCandidato: valor }),
    });
    if (!res.ok) {
      toast.error("Falha ao atualizar");
      return;
    }
    router.refresh();
  }

  async function excluir(c: ClienteRow) {
    if (!confirm(`Excluir o cliente "${c.nome}"?`)) return;
    const res = await fetch(`/api/clientes/${c.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.erro ?? "Falha ao excluir");
      return;
    }
    toast.success("Cliente excluído");
    router.refresh();
  }

  async function salvar(formData: FormData) {
    setSalvando(true);
    const payload = {
      nome: formData.get("nome"),
      nomeCompleto: formData.get("nomeCompleto") || null,
      isCandidato: formData.get("isCandidato") === "on",
      ativo: formData.get("ativo") === "on",
    };
    try {
      const res = await fetch(editando ? `/api/clientes/${editando.id}` : "/api/clientes", {
        method: editando ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.erro?.formErrors?.[0] ?? "Falha ao salvar");
        return;
      }
      toast.success("Cliente salvo");
      setDialogAberto(false);
      router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
            <DialogTrigger render={<Button onClick={abrirNovo} />}>
              <Plus className="mr-1 h-4 w-4" /> Novo Cliente
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editando ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
              </DialogHeader>
              <form action={salvar} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome (chave curta)</Label>
                  <Input id="nome" name="nome" defaultValue={editando?.nome} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nomeCompleto">Nome completo</Label>
                  <Input id="nomeCompleto" name="nomeCompleto" defaultValue={editando?.nomeCompleto ?? ""} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="isCandidato">Candidato (entra no rateio)</Label>
                  <Switch id="isCandidato" name="isCandidato" defaultChecked={editando?.isCandidato ?? true} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="ativo">Ativo</Label>
                  <Switch id="ativo" name="ativo" defaultChecked={editando?.ativo ?? true} />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={salvando}>
                    {salvando ? "Salvando..." : "Salvar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Candidato</TableHead>
              <TableHead className="text-right">Contrato</TableHead>
              <TableHead className="text-right">Recebido</TableHead>
              <TableHead className="text-right">Resultado</TableHead>
              <TableHead className="text-right">Margem Projetada</TableHead>
              <TableHead className="text-right">Margem Real</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map(({ cliente, receita, resultado }) => (
              <TableRow key={cliente.id}>
                <TableCell>
                  <Link href={`/clientes/${cliente.id}`} className="font-medium hover:underline">
                    {cliente.nome}
                  </Link>
                  {cliente.nomeCompleto && (
                    <div className="text-xs text-muted-foreground">{cliente.nomeCompleto}</div>
                  )}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={cliente.isCandidato}
                    disabled={!isAdmin}
                    onCheckedChange={(v) => toggleCandidato(cliente, v)}
                  />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(receita?.contratoTotal ?? 0)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(receita?.recebido ?? 0)}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right tabular-nums font-medium",
                    (resultado?.resultado ?? 0) >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  )}
                >
                  {formatCurrency(resultado?.resultado ?? 0)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {receita && receita.contratoTotal > 0
                    ? formatPercent((resultado?.resultado ?? 0) / receita.contratoTotal)
                    : "—"}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right tabular-nums",
                    resultado?.margemReal == null
                      ? "text-muted-foreground"
                      : resultado.margemReal >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                  )}
                  title={
                    resultado?.margemReal == null
                      ? "Ainda não há receita recebida desta campanha"
                      : undefined
                  }
                >
                  {resultado?.margemReal == null ? "—" : formatPercent(resultado.margemReal)}
                </TableCell>
                <TableCell>
                  {isAdmin && (
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => abrirEdicao(cliente)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => excluir(cliente)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
