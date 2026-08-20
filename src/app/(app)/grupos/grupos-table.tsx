"use client";

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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface GrupoRow {
  id: string;
  nome: string;
  cor: string | null;
  _count: { despesas: number };
}

export function GruposTable({
  grupos,
  isAdmin = false,
}: {
  grupos: GrupoRow[];
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando] = useState<GrupoRow | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function excluir(g: GrupoRow) {
    if (!confirm(`Excluir o grupo "${g.nome}"?`)) return;
    const res = await fetch(`/api/grupos/${g.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.erro ?? "Falha ao excluir");
      return;
    }
    toast.success("Grupo excluído");
    router.refresh();
  }

  async function salvar(formData: FormData) {
    setSalvando(true);
    const payload = { nome: formData.get("nome"), cor: formData.get("cor") || null };
    try {
      const res = await fetch(editando ? `/api/grupos/${editando.id}` : "/api/grupos", {
        method: editando ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.erro?.formErrors?.[0] ?? "Falha ao salvar");
        return;
      }
      toast.success("Grupo salvo");
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
            <DialogTrigger render={<Button onClick={() => setEditando(null)} />}>
              <Plus className="mr-1 h-4 w-4" /> Novo Grupo
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editando ? "Editar Grupo" : "Novo Grupo"}</DialogTitle>
              </DialogHeader>
              <form action={salvar} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome</Label>
                  <Input id="nome" name="nome" defaultValue={editando?.nome} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cor">Cor</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="cor"
                      name="cor"
                      type="color"
                      defaultValue={editando?.cor ?? "#2563eb"}
                      className="h-9 w-16 p-1"
                    />
                  </div>
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
              <TableHead className="text-right">Despesas</TableHead>
              <TableHead className="w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {grupos.map((g) => (
              <TableRow key={g.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: g.cor ?? "#94a3b8" }}
                    />
                    {g.nome}
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">{g._count.despesas}</TableCell>
                <TableCell>
                  {isAdmin && (
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditando(g);
                          setDialogAberto(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => excluir(g)}>
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
