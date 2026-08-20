"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown, CheckCircle2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { formatCurrency, formatDate, formatDateInput, LABEL_RATEIO, LABEL_STATUS_DESPESA } from "@/lib/format";

interface Ref {
  id: string;
  nome: string;
}

interface DespesaRow {
  id: string;
  fornecedorId: string;
  fornecedorNome: string;
  grupoId: string;
  grupoNome: string;
  descricao: string;
  parcelaNum: number | null;
  parcelaTotal: number | null;
  vencimento: string;
  dataPagamento: string | null;
  valor: number;
  status: "PAGO" | "A_PAGAR";
  rateio: "ESPECIFICA" | "TODAS" | "NAO_ALOCADA";
  clienteId: string | null;
  clienteNome: string | null;
}

type Ordenacao = "vencimento" | "valor" | "fornecedor";

export function DespesasTable({
  linhas,
  clientes,
  fornecedores,
  grupos,
  filtroInicial,
  podeExcluir = false,
}: {
  linhas: DespesaRow[];
  clientes: Ref[];
  fornecedores: Ref[];
  grupos: Ref[];
  filtroInicial?: string;
  podeExcluir?: boolean;
}) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [filtroCliente, setFiltroCliente] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroGrupo, setFiltroGrupo] = useState("todos");
  const [filtroFornecedor, setFiltroFornecedor] = useState("todos");
  const [filtroRateio, setFiltroRateio] = useState(filtroInicial ?? "todos");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("vencimento");
  const [ordemDesc, setOrdemDesc] = useState(false);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());

  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando] = useState<DespesaRow | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [status, setStatus] = useState<"PAGO" | "A_PAGAR">("A_PAGAR");
  const [rateio, setRateio] = useState<"ESPECIFICA" | "TODAS" | "NAO_ALOCADA">("ESPECIFICA");
  // Gerada de novo a cada abertura do diálogo de criação — se o usuário der duplo-clique
  // em "Salvar" ou a requisição for reenviada pela rede, o backend detecta a mesma chave
  // e devolve o lançamento já criado em vez de duplicá-lo.
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);

  const [dialogClassificar, setDialogClassificar] = useState(false);
  const [classificando, setClassificando] = useState(false);
  const [rateioClassificar, setRateioClassificar] = useState<"ESPECIFICA" | "TODAS">("ESPECIFICA");
  const [clienteClassificar, setClienteClassificar] = useState<string>(clientes[0]?.id ?? "");

  const [dialogGrupo, setDialogGrupo] = useState(false);
  const [reclassificandoGrupo, setReclassificandoGrupo] = useState(false);
  const [grupoDestino, setGrupoDestino] = useState<string>(grupos[0]?.id ?? "");

  const filtradas = useMemo(() => {
    let dados = linhas;
    if (busca.trim()) {
      const termo = busca.toLowerCase();
      dados = dados.filter(
        (d) => d.descricao.toLowerCase().includes(termo) || d.fornecedorNome.toLowerCase().includes(termo)
      );
    }
    if (filtroCliente !== "todos") dados = dados.filter((d) => d.clienteId === filtroCliente);
    if (filtroStatus !== "todos") dados = dados.filter((d) => d.status === filtroStatus);
    if (filtroGrupo !== "todos") dados = dados.filter((d) => d.grupoId === filtroGrupo);
    if (filtroFornecedor !== "todos") dados = dados.filter((d) => d.fornecedorId === filtroFornecedor);
    if (filtroRateio !== "todos") dados = dados.filter((d) => d.rateio === filtroRateio);

    return [...dados].sort((a, b) => {
      let cmp = 0;
      if (ordenacao === "vencimento") cmp = a.vencimento.localeCompare(b.vencimento);
      else if (ordenacao === "valor") cmp = a.valor - b.valor;
      else cmp = a.fornecedorNome.localeCompare(b.fornecedorNome);
      return ordemDesc ? -cmp : cmp;
    });
  }, [linhas, busca, filtroCliente, filtroStatus, filtroGrupo, filtroFornecedor, filtroRateio, ordenacao, ordemDesc]);

  function alternarOrdenacao(campo: Ordenacao) {
    if (ordenacao === campo) setOrdemDesc((v) => !v);
    else {
      setOrdenacao(campo);
      setOrdemDesc(false);
    }
  }

  function abrirNovo() {
    setEditando(null);
    setStatus("A_PAGAR");
    setRateio("ESPECIFICA");
    setIdempotencyKey(crypto.randomUUID());
    setDialogAberto(true);
  }

  function abrirEdicao(d: DespesaRow) {
    setEditando(d);
    setStatus(d.status);
    setRateio(d.rateio);
    setDialogAberto(true);
  }

  async function excluir(d: DespesaRow) {
    if (!confirm(`Excluir a despesa "${d.descricao}"?`)) return;
    const res = await fetch(`/api/despesas/${d.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Falha ao excluir");
      return;
    }
    toast.success("Despesa excluída");
    router.refresh();
  }

  async function baixaRapida(d: DespesaRow) {
    const hoje = new Date().toISOString().slice(0, 10);
    const data = prompt("Data do pagamento (dd/mm/aaaa):", formatDate(hoje));
    if (!data) return;
    const [dd, mm, yyyy] = data.split("/");
    if (!dd || !mm || !yyyy) {
      toast.error("Data inválida");
      return;
    }
    const res = await fetch(`/api/despesas/${d.id}/baixa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataPagamento: `${yyyy}-${mm}-${dd}` }),
    });
    if (!res.ok) {
      toast.error("Falha ao dar baixa");
      return;
    }
    toast.success("Despesa marcada como paga");
    router.refresh();
  }

  async function salvar(formData: FormData) {
    setSalvando(true);
    const payload = {
      fornecedorId: formData.get("fornecedorId"),
      grupoId: formData.get("grupoId"),
      descricao: formData.get("descricao"),
      parcelaNum: formData.get("parcelaNum") ? Number(formData.get("parcelaNum")) : null,
      parcelaTotal: formData.get("parcelaTotal") ? Number(formData.get("parcelaTotal")) : null,
      vencimento: formData.get("vencimento"),
      dataPagamento: formData.get("dataPagamento") || null,
      valor: Number(formData.get("valor")),
      status: formData.get("status"),
      rateio: formData.get("rateio"),
      clienteId: rateio === "ESPECIFICA" ? formData.get("clienteId") : null,
      idempotencyKey: editando ? undefined : idempotencyKey,
    };
    try {
      const res = await fetch(editando ? `/api/despesas/${editando.id}` : "/api/despesas", {
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
      toast.success("Despesa salva");
      setDialogAberto(false);
      router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  async function classificarSelecionadas() {
    setClassificando(true);
    try {
      const res = await fetch("/api/despesas/batch-classificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selecionadas),
          rateio: rateioClassificar,
          clienteId: rateioClassificar === "ESPECIFICA" ? clienteClassificar : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.erro ?? "Falha ao classificar");
        return;
      }
      toast.success(`${data.atualizadas} despesa(s) classificada(s)`);
      setSelecionadas(new Set());
      setDialogClassificar(false);
      router.refresh();
    } finally {
      setClassificando(false);
    }
  }

  async function reclassificarGrupoSelecionadas() {
    setReclassificandoGrupo(true);
    try {
      const res = await fetch("/api/despesas/batch-classificar-grupo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selecionadas), grupoId: grupoDestino }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.erro ?? "Falha ao reclassificar");
        return;
      }
      toast.success(`${data.atualizadas} despesa(s) movida(s) de grupo`);
      setSelecionadas(new Set());
      setDialogGrupo(false);
      router.refresh();
    } finally {
      setReclassificandoGrupo(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Buscar por descrição ou fornecedor..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-56"
          />
          <Select value={filtroCliente} onValueChange={(v) => setFiltroCliente(v ?? "todos")}>
            <SelectTrigger className="w-36">
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
          <Select value={filtroGrupo} onValueChange={(v) => setFiltroGrupo(v ?? "todos")}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Grupo">
                {(v: string) =>
                  v === "todos" ? "Todos os grupos" : grupos.find((g) => g.id === v)?.nome ?? v
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os grupos</SelectItem>
              {grupos.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filtroFornecedor} onValueChange={(v) => setFiltroFornecedor(v ?? "todos")}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Fornecedor">
                {(v: string) =>
                  v === "todos" ? "Todos os fornecedores" : fornecedores.find((f) => f.id === v)?.nome ?? v
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os fornecedores</SelectItem>
              {fornecedores.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filtroRateio} onValueChange={(v) => setFiltroRateio(v ?? "todos")}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Rateio">
                {(v: string) => (v === "todos" ? "Todos os rateios" : LABEL_RATEIO[v] ?? v)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os rateios</SelectItem>
              <SelectItem value="ESPECIFICA">Específica</SelectItem>
              <SelectItem value="TODAS">Todas</SelectItem>
              <SelectItem value="NAO_ALOCADA">Não Alocada</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v ?? "todos")}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status">
                {(v: string) =>
                  v === "todos" ? "Todos os status" : LABEL_STATUS_DESPESA[v] ?? v
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="PAGO">Pago</SelectItem>
              <SelectItem value="A_PAGAR">A Pagar</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
          <DialogTrigger render={<Button onClick={abrirNovo} />}>
            <Plus className="mr-1 h-4 w-4" /> Nova Despesa
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editando ? "Editar Despesa" : "Nova Despesa"}</DialogTitle>
            </DialogHeader>
            <form action={salvar} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="fornecedorId">Fornecedor</Label>
                  <Select name="fornecedorId" defaultValue={editando?.fornecedorId} required>
                    <SelectTrigger id="fornecedorId">
                      <SelectValue placeholder="Selecione...">
                        {(v: string) => fornecedores.find((f) => f.id === v)?.nome ?? v}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {fornecedores.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grupoId">Grupo</Label>
                  <Select name="grupoId" defaultValue={editando?.grupoId} required>
                    <SelectTrigger id="grupoId">
                      <SelectValue placeholder="Selecione...">
                        {(v: string) => grupos.find((g) => g.id === v)?.nome ?? v}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {grupos.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                  <Select name="status" value={status} onValueChange={(v) => setStatus(v as "PAGO" | "A_PAGAR")}>
                    <SelectTrigger id="status">
                      <SelectValue>{(v: string) => LABEL_STATUS_DESPESA[v] ?? v}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PAGO">Pago</SelectItem>
                      <SelectItem value="A_PAGAR">A Pagar</SelectItem>
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
                    required={status === "PAGO"}
                    disabled={status !== "PAGO"}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="rateio">Rateio</Label>
                  <Select
                    name="rateio"
                    value={rateio}
                    onValueChange={(v) => setRateio(v as typeof rateio)}
                  >
                    <SelectTrigger id="rateio">
                      <SelectValue>{(v: string) => LABEL_RATEIO[v] ?? v}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ESPECIFICA">Específica</SelectItem>
                      <SelectItem value="TODAS">Todas</SelectItem>
                      <SelectItem value="NAO_ALOCADA">Não Alocada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clienteId">Campanha</Label>
                  <Select
                    name="clienteId"
                    defaultValue={editando?.clienteId ?? undefined}
                    disabled={rateio !== "ESPECIFICA"}
                  >
                    <SelectTrigger id="clienteId">
                      <SelectValue placeholder={rateio === "ESPECIFICA" ? "Selecione..." : "—"}>
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

      {selecionadas.size > 0 && (
        <div className="flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2">
          <span className="text-sm">{selecionadas.size} selecionada(s)</span>
          <div className="flex gap-2">
          <Dialog open={dialogGrupo} onOpenChange={setDialogGrupo}>
            <DialogTrigger render={<Button size="sm" variant="outline" />}>Reclassificar grupo</DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reclassificar {selecionadas.size} despesa(s) para outro grupo</DialogTitle>
              </DialogHeader>
              <div className="space-y-2">
                <Label>Grupo de destino</Label>
                <Select value={grupoDestino} onValueChange={(v) => setGrupoDestino(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione...">
                      {(v: string) => grupos.find((g) => g.id === v)?.nome ?? v}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {grupos.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button onClick={reclassificarGrupoSelecionadas} disabled={reclassificandoGrupo || !grupoDestino}>
                  {reclassificandoGrupo ? "Aplicando..." : "Aplicar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={dialogClassificar} onOpenChange={setDialogClassificar}>
            <DialogTrigger render={<Button size="sm" />}>Classificar campanha</DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Classificar {selecionadas.size} despesa(s)</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Rateio</Label>
                  <Select
                    value={rateioClassificar}
                    onValueChange={(v) => setRateioClassificar(v as "ESPECIFICA" | "TODAS")}
                  >
                    <SelectTrigger>
                      <SelectValue>{(v: string) => LABEL_RATEIO[v] ?? v}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ESPECIFICA">Específica</SelectItem>
                      <SelectItem value="TODAS">Todas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {rateioClassificar === "ESPECIFICA" && (
                  <div className="space-y-2">
                    <Label>Campanha</Label>
                    <Select value={clienteClassificar} onValueChange={(v) => setClienteClassificar(v ?? "")}>
                      <SelectTrigger>
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
                )}
              </div>
              <DialogFooter>
                <Button onClick={classificarSelecionadas} disabled={classificando}>
                  {classificando ? "Aplicando..." : "Aplicar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      )}

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={filtradas.length > 0 && filtradas.every((d) => selecionadas.has(d.id))}
                  onCheckedChange={(v) => {
                    setSelecionadas(v ? new Set(filtradas.map((d) => d.id)) : new Set());
                  }}
                />
              </TableHead>
              <TableHead>
                <button className="flex items-center gap-1" onClick={() => alternarOrdenacao("fornecedor")}>
                  Despesa <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead className="w-32 text-right">
                <button
                  className="ml-auto flex items-center gap-1"
                  onClick={() => alternarOrdenacao("valor")}
                >
                  Valor <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Grupo</TableHead>
              <TableHead>Campanha</TableHead>
              <TableHead>
                <button className="flex items-center gap-1" onClick={() => alternarOrdenacao("vencimento")}>
                  Vencimento <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtradas.map((d) => (
              <TableRow key={d.id}>
                <TableCell>
                  <Checkbox
                    checked={selecionadas.has(d.id)}
                    onCheckedChange={(v) => {
                      setSelecionadas((prev) => {
                        const next = new Set(prev);
                        if (v) next.add(d.id);
                        else next.delete(d.id);
                        return next;
                      });
                    }}
                  />
                </TableCell>
                <TableCell className="max-w-[200px] truncate font-medium" title={d.fornecedorNome}>
                  {d.fornecedorNome}
                </TableCell>
                <TableCell className="w-32 text-right tabular-nums font-medium">
                  {formatCurrency(d.valor)}
                </TableCell>
                <TableCell>
                  {d.descricao}
                  {d.parcelaNum && d.parcelaTotal && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({d.parcelaNum}/{d.parcelaTotal})
                    </span>
                  )}
                </TableCell>
                <TableCell>{d.grupoNome}</TableCell>
                <TableCell>
                  {d.clienteNome ?? (
                    <Badge variant={d.rateio === "NAO_ALOCADA" ? "destructive" : "outline"}>
                      {LABEL_RATEIO[d.rateio]}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{formatDate(d.vencimento)}</TableCell>
                <TableCell>
                  <Badge variant={d.status === "PAGO" ? "default" : "secondary"}>
                    {LABEL_STATUS_DESPESA[d.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    {d.status === "A_PAGAR" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Marcar como pago"
                        onClick={() => baixaRapida(d)}
                      >
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => abrirEdicao(d)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {podeExcluir && (
                      <Button variant="ghost" size="icon" onClick={() => excluir(d)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtradas.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
                  {linhas.length === 0
                    ? "Nenhuma despesa cadastrada."
                    : "Nenhuma despesa encontrada para os filtros aplicados."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
