"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown, CheckCircle2, Pencil, Plus, Trash2 } from "lucide-react";
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
import { formatCurrency, formatDate, formatDateInput, LABEL_STATUS_RECEITA } from "@/lib/format";

interface Cliente {
  id: string;
  nome: string;
}

interface ReceitaRow {
  id: string;
  clienteId: string;
  clienteNome: string;
  descricao: string;
  parcelaNum: number | null;
  parcelaTotal: number | null;
  vencimento: string;
  dataPagamento: string | null;
  valor: number;
  status: "RECEBIDO" | "A_RECEBER";
}

type Ordenacao = "vencimento" | "valor" | "cliente";

export function ReceitasTable({ linhas, clientes }: { linhas: ReceitaRow[]; clientes: Cliente[] }) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [filtroCliente, setFiltroCliente] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("vencimento");
  const [ordemDesc, setOrdemDesc] = useState(false);

  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando] = useState<ReceitaRow | null>(null);
  const [salvando, setSalvando] = useState(false);
  // Gerada de novo a cada abertura do diálogo de criação — se o usuário der duplo-clique
  // em "Salvar" ou a requisição for reenviada pela rede, o backend detecta a mesma chave
  // e devolve o lançamento já criado em vez de duplicá-lo.
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [status, setStatus] = useState<"RECEBIDO" | "A_RECEBER">("A_RECEBER");

  const filtradas = useMemo(() => {
    let dados = linhas;
    if (busca.trim()) {
      const termo = busca.toLowerCase();
      dados = dados.filter(
        (r) => r.descricao.toLowerCase().includes(termo) || r.clienteNome.toLowerCase().includes(termo)
      );
    }
    if (filtroCliente !== "todos") dados = dados.filter((r) => r.clienteId === filtroCliente);
    if (filtroStatus !== "todos") dados = dados.filter((r) => r.status === filtroStatus);

    const ordenadas = [...dados].sort((a, b) => {
      let cmp = 0;
      if (ordenacao === "vencimento") cmp = a.vencimento.localeCompare(b.vencimento);
      else if (ordenacao === "valor") cmp = a.valor - b.valor;
      else cmp = a.clienteNome.localeCompare(b.clienteNome);
      return ordemDesc ? -cmp : cmp;
    });
    return ordenadas;
  }, [linhas, busca, filtroCliente, filtroStatus, ordenacao, ordemDesc]);

  function alternarOrdenacao(campo: Ordenacao) {
    if (ordenacao === campo) setOrdemDesc((v) => !v);
    else {
      setOrdenacao(campo);
      setOrdemDesc(false);
    }
  }

  function abrirNovo() {
    setEditando(null);
    setStatus("A_RECEBER");
    setIdempotencyKey(crypto.randomUUID());
    setDialogAberto(true);
  }

  function abrirEdicao(r: ReceitaRow) {
    setEditando(r);
    setStatus(r.status);
    setDialogAberto(true);
  }

  async function excluir(r: ReceitaRow) {
    if (!confirm(`Excluir a receita "${r.descricao}"?`)) return;
    const res = await fetch(`/api/receitas/${r.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Falha ao excluir");
      return;
    }
    toast.success("Receita excluída");
    router.refresh();
  }

  async function baixaRapida(r: ReceitaRow) {
    const hoje = new Date().toISOString().slice(0, 10);
    const data = prompt("Data do recebimento (dd/mm/aaaa):", formatDate(hoje));
    if (!data) return;
    const [dd, mm, yyyy] = data.split("/");
    if (!dd || !mm || !yyyy) {
      toast.error("Data inválida");
      return;
    }
    const res = await fetch(`/api/receitas/${r.id}/baixa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataPagamento: `${yyyy}-${mm}-${dd}` }),
    });
    if (!res.ok) {
      toast.error("Falha ao dar baixa");
      return;
    }
    toast.success("Receita marcada como recebida");
    router.refresh();
  }

  async function salvar(formData: FormData) {
    setSalvando(true);
    const payload = {
      clienteId: formData.get("clienteId"),
      descricao: formData.get("descricao"),
      parcelaNum: formData.get("parcelaNum") ? Number(formData.get("parcelaNum")) : null,
      parcelaTotal: formData.get("parcelaTotal") ? Number(formData.get("parcelaTotal")) : null,
      vencimento: formData.get("vencimento"),
      dataPagamento: formData.get("dataPagamento") || null,
      valor: Number(formData.get("valor")),
      status: formData.get("status"),
      idempotencyKey: editando ? undefined : idempotencyKey,
    };
    try {
      const res = await fetch(editando ? `/api/receitas/${editando.id}` : "/api/receitas", {
        method: editando ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.erro?.formErrors?.[0] ?? "Falha ao salvar. Confira os campos.");
        return;
      }
      if (!editando) setIdempotencyKey(crypto.randomUUID());
      toast.success("Receita salva");
      setDialogAberto(false);
      router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Buscar por descrição ou cliente..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-64"
          />
          <Select value={filtroCliente} onValueChange={(v) => setFiltroCliente(v ?? "todos")}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Cliente">
                {(v: string) =>
                  v === "todos" ? "Todos os clientes" : clientes.find((c) => c.id === v)?.nome ?? v
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os clientes</SelectItem>
              {clientes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v ?? "todos")}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status">
                {(v: string) =>
                  v === "todos" ? "Todos os status" : LABEL_STATUS_RECEITA[v] ?? v
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="RECEBIDO">Recebido</SelectItem>
              <SelectItem value="A_RECEBER">A Receber</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
          <DialogTrigger render={<Button onClick={abrirNovo} />}>
            <Plus className="mr-1 h-4 w-4" /> Nova Receita
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editando ? "Editar Receita" : "Nova Receita"}</DialogTitle>
            </DialogHeader>
            <form action={salvar} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clienteId">Cliente</Label>
                <Select name="clienteId" defaultValue={editando?.clienteId} required>
                  <SelectTrigger id="clienteId">
                    <SelectValue placeholder="Selecione...">
                      {(v: string) => clientes.find((c) => c.id === v)?.nome ?? v}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Input id="descricao" name="descricao" defaultValue={editando?.descricao} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="parcelaNum">Parcela nº</Label>
                  <Input
                    id="parcelaNum"
                    name="parcelaNum"
                    type="number"
                    min={1}
                    defaultValue={editando?.parcelaNum ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parcelaTotal">Total de parcelas</Label>
                  <Input
                    id="parcelaTotal"
                    name="parcelaTotal"
                    type="number"
                    min={1}
                    defaultValue={editando?.parcelaTotal ?? ""}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="vencimento">Vencimento</Label>
                  <Input
                    id="vencimento"
                    name="vencimento"
                    type="date"
                    defaultValue={formatDateInput(editando?.vencimento)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valor">Valor</Label>
                  <Input
                    id="valor"
                    name="valor"
                    type="number"
                    step="0.01"
                    min="0.01"
                    defaultValue={editando?.valor}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    name="status"
                    value={status}
                    onValueChange={(v) => setStatus(v as "RECEBIDO" | "A_RECEBER")}
                  >
                    <SelectTrigger id="status">
                      <SelectValue>{(v: string) => LABEL_STATUS_RECEITA[v] ?? v}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RECEBIDO">Recebido</SelectItem>
                      <SelectItem value="A_RECEBER">A Receber</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataPagamento">Data de pagamento</Label>
                  <Input
                    id="dataPagamento"
                    name="dataPagamento"
                    type="date"
                    defaultValue={formatDateInput(editando?.dataPagamento)}
                    required={status === "RECEBIDO"}
                    disabled={status !== "RECEBIDO"}
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

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button className="flex items-center gap-1" onClick={() => alternarOrdenacao("cliente")}>
                  Cliente <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>
                <button className="flex items-center gap-1" onClick={() => alternarOrdenacao("vencimento")}>
                  Vencimento <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">
                <button
                  className="ml-auto flex items-center gap-1"
                  onClick={() => alternarOrdenacao("valor")}
                >
                  Valor <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtradas.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.clienteNome}</TableCell>
                <TableCell>
                  {r.descricao}
                  {r.parcelaNum && r.parcelaTotal && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({r.parcelaNum}/{r.parcelaTotal})
                    </span>
                  )}
                </TableCell>
                <TableCell>{formatDate(r.vencimento)}</TableCell>
                <TableCell>
                  <Badge variant={r.status === "RECEBIDO" ? "default" : "secondary"}>
                    {LABEL_STATUS_RECEITA[r.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {formatCurrency(r.valor)}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    {r.status === "A_RECEBER" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Marcar como recebido"
                        onClick={() => baixaRapida(r)}
                      >
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => abrirEdicao(r)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => excluir(r)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtradas.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  {linhas.length === 0 ? (
                    "Nenhuma receita cadastrada."
                  ) : (
                    "Nenhuma receita encontrada para os filtros aplicados."
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
