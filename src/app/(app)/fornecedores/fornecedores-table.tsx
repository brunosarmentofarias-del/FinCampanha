"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import { inferirTipoFornecedor } from "@/lib/documento";

interface FornecedorRow {
  id: string;
  nome: string;
  documento: string | null;
  tipo: "PF" | "PJ";
  _count: { despesas: number };
  totalDespesas: number;
}

export function FornecedoresTable({ linhas }: { linhas: FornecedorRow[] }) {
  const router = useRouter();
  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando] = useState<FornecedorRow | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [documento, setDocumento] = useState("");
  const tipoDetectado = inferirTipoFornecedor(documento);

  async function excluir(f: FornecedorRow) {
    if (!confirm(`Excluir o fornecedor "${f.nome}"?`)) return;
    const res = await fetch(`/api/fornecedores/${f.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.erro ?? "Falha ao excluir");
      return;
    }
    toast.success("Fornecedor excluído");
    router.refresh();
  }

  async function salvar(formData: FormData) {
    setSalvando(true);
    const payload = {
      nome: formData.get("nome"),
      documento: formData.get("documento") || null,
    };
    try {
      const res = await fetch(editando ? `/api/fornecedores/${editando.id}` : "/api/fornecedores", {
        method: editando ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.erro?.formErrors?.[0] ?? "Falha ao salvar");
        return;
      }
      toast.success("Fornecedor salvo");
      setDialogAberto(false);
      router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
          <DialogTrigger
            render={
              <Button
                onClick={() => {
                  setEditando(null);
                  setDocumento("");
                }}
              />
            }
          >
            <Plus className="mr-1 h-4 w-4" /> Novo Fornecedor
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editando ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle>
            </DialogHeader>
            <form action={salvar} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input id="nome" name="nome" defaultValue={editando?.nome} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="documento">CPF/CNPJ</Label>
                <Input
                  id="documento"
                  name="documento"
                  value={documento}
                  onChange={(e) => setDocumento(e.target.value)}
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                />
                <p className="text-xs text-muted-foreground">
                  {tipoDetectado === "PF" && "Reconhecido como Pessoa Física (CPF)."}
                  {tipoDetectado === "PJ" && "Reconhecido como Pessoa Jurídica (CNPJ)."}
                  {tipoDetectado === null &&
                    (editando
                      ? `Tipo atual mantido: ${editando.tipo === "PF" ? "Pessoa Física" : "Pessoa Jurídica"} — preencha um CPF (11 dígitos) ou CNPJ (14 dígitos) para reclassificar.`
                      : "Preencha o CPF (11 dígitos) ou CNPJ (14 dígitos) para o sistema reconhecer o tipo automaticamente.")}
                </p>
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

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Lançamentos</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="max-w-[240px]">
                  <Link
                    href={`/fornecedores/${f.id}`}
                    className="block truncate font-medium hover:underline"
                    title={f.nome}
                  >
                    {f.nome}
                  </Link>
                  {f.documento && <div className="text-xs text-muted-foreground">{f.documento}</div>}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{f.tipo}</Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{f._count.despesas}</TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {formatCurrency(f.totalDespesas)}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditando(f);
                        setDocumento(f.documento ?? "");
                        setDialogAberto(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => excluir(f)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
