"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ShieldCheck, Trash2, UserCog } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";

interface UsuarioRow {
  id: string;
  nome: string | null;
  email: string;
  role: "ADMIN" | "FINANCEIRO";
  createdAt: Date;
}

const LABEL_ROLE: Record<UsuarioRow["role"], string> = {
  ADMIN: "Administrador",
  FINANCEIRO: "Financeiro",
};

export function UsuariosTable({
  linhas,
  usuarioAtualId,
}: {
  linhas: UsuarioRow[];
  usuarioAtualId: string;
}) {
  const router = useRouter();
  const [dialogAberto, setDialogAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [role, setRole] = useState<"ADMIN" | "FINANCEIRO">("FINANCEIRO");

  async function salvar(formData: FormData) {
    setSalvando(true);
    try {
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: formData.get("nome"),
          email: formData.get("email"),
          senha: formData.get("senha"),
          role,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.erro?.formErrors?.[0] ?? data.erro ?? "Falha ao criar usuário");
        return;
      }
      toast.success("Acesso criado");
      setDialogAberto(false);
      setRole("FINANCEIRO");
      router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(u: UsuarioRow) {
    if (!confirm(`Remover o acesso de "${u.nome ?? u.email}"?`)) return;
    const res = await fetch(`/api/usuarios/${u.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.erro ?? "Falha ao remover");
      return;
    }
    toast.success("Acesso removido");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
          <DialogTrigger render={<Button onClick={() => setRole("FINANCEIRO")} />}>
            <Plus className="mr-1 h-4 w-4" /> Novo Acesso
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Acesso</DialogTitle>
            </DialogHeader>
            <form action={salvar} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input id="nome" name="nome" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <Input id="senha" name="senha" type="password" minLength={8} required />
                <p className="text-xs text-muted-foreground">Pelo menos 8 caracteres.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Papel</Label>
                <Select value={role} onValueChange={(v) => setRole((v as typeof role) ?? "FINANCEIRO")}>
                  <SelectTrigger id="role">
                    <SelectValue>{(v: string) => LABEL_ROLE[v as UsuarioRow["role"]] ?? v}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FINANCEIRO">Financeiro — lança e edita, não exclui</SelectItem>
                    <SelectItem value="ADMIN">Administrador — acesso total</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={salvando}>
                  {salvando ? "Criando..." : "Criar acesso"}
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
              <TableHead>E-mail</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {linhas.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">
                  {u.nome ?? "—"}
                  {u.id === usuarioAtualId && (
                    <span className="ml-1.5 text-xs text-muted-foreground">(você)</span>
                  )}
                </TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <Badge variant={u.role === "ADMIN" ? "default" : "outline"} className="gap-1">
                    {u.role === "ADMIN" ? (
                      <ShieldCheck className="h-3 w-3" />
                    ) : (
                      <UserCog className="h-3 w-3" />
                    )}
                    {LABEL_ROLE[u.role]}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                <TableCell>
                  {u.id !== usuarioAtualId && (
                    <Button variant="ghost" size="icon" onClick={() => excluir(u)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
