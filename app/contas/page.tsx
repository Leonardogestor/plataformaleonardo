"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

// Tipos de conta
const tiposConta = [
  { value: "corrente", label: "Conta Corrente" },
  { value: "poupanca", label: "Poupança" },
  { value: "investimento", label: "Investimento" },
  { value: "carteira", label: "Carteira / Dinheiro" },
  { value: "outro", label: "Outro" },
]

// Simulação de dados de contas
const contasIniciais = [
  {
    id: 1,
    nome: "Conta Principal",
    instituicao: "Banco XPTO",
    tipo: "corrente",
    saldoInicial: 5000,
    dataSaldo: "2026-01-01",
    observacoes: "Conta salário",
    ativa: true,
    saldoAtual: 7500,
    impacto: "ativo",
  },
  {
    id: 2,
    nome: "Poupança Família",
    instituicao: "Banco LMG PLATAFORMA",
    tipo: "poupanca",
    saldoInicial: 2000,
    dataSaldo: "2026-01-01",
    observacoes: "Reserva de emergência",
    ativa: true,
    saldoAtual: 2500,
    impacto: "ativo",
  },
  {
    id: 3,
    nome: "Conta Antiga",
    instituicao: "Banco Antigo",
    tipo: "corrente",
    saldoInicial: 1000,
    dataSaldo: "2025-01-01",
    observacoes: "Encerrada em 2025",
    ativa: false,
    saldoAtual: 1000,
    impacto: "ativo",
  },
]

export default function ContasPage() {
  const [contas, setContas] = useState(contasIniciais)
  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState(null as null | number)
  const [form, setForm] = useState({
    nome: "",
    instituicao: "",
    tipo: "corrente",
    saldoInicial: "",
    dataSaldo: "",
    observacoes: "",
  })
  const { toast } = useToast()

  // Abrir modal para nova conta
  const abrirNovaConta = () => {
    setEditando(null)
    setForm({
      nome: "",
      instituicao: "",
      tipo: "corrente",
      saldoInicial: "",
      dataSaldo: "",
      observacoes: "",
    })
    setModalAberto(true)
  }
  // Abrir modal para editar conta
  const abrirEditarConta = (id: number) => {
    const c = contas.find((c) => c.id === id)
    if (!c) return
    setEditando(id)
    setForm({
      nome: c.nome,
      instituicao: c.instituicao,
      tipo: c.tipo,
      saldoInicial: c.saldoInicial.toString(),
      dataSaldo: c.dataSaldo,
      observacoes: c.observacoes || "",
    })
    setModalAberto(true)
  }
  // Salvar conta (nova ou edição)
  const salvarConta = () => {
    if (!form.nome || !form.instituicao || !form.saldoInicial || !form.dataSaldo) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" })
      return
    }
    if (editando) {
      // Edição exige confirmação para saldo inicial
      if (contas.find((c) => c.id === editando)?.saldoInicial.toString() !== form.saldoInicial) {
        if (
          !window.confirm(
            "Alterar o saldo inicial mudará o ponto de partida histórico. Tem certeza?"
          )
        )
          return
      }
      setContas(
        contas.map((c) =>
          c.id === editando
            ? {
                ...c,
                ...form,
                saldoInicial: Number(form.saldoInicial),
                saldoAtual: c.saldoAtual,
                dataSaldo: form.dataSaldo,
                observacoes: form.observacoes,
              }
            : c
        )
      )
      toast({ title: "Conta atualizada com sucesso" })
    } else {
      setContas([
        ...contas,
        {
          id: Math.max(...contas.map((c) => c.id)) + 1,
          ...form,
          saldoInicial: Number(form.saldoInicial),
          saldoAtual: Number(form.saldoInicial),
          ativa: true,
          impacto: "ativo",
        },
      ])
      toast({ title: "Conta criada com sucesso" })
    }
    setModalAberto(false)
  }
  // Desativar conta
  const desativarConta = (id: number) => {
    setContas(contas.map((c) => (c.id === id ? { ...c, ativa: false } : c)))
    toast({ title: "Conta desativada (histórico mantido)" })
  }

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      <h1 className="text-4xl font-bold mb-2">Contas Financeiras</h1>
      <p className="text-muted-foreground mb-6 text-lg">
        Gerencie suas contas de forma centralizada. O saldo é calculado automaticamente a partir das
        movimentações. Contas inativas não impactam seu patrimônio, mas permanecem visíveis para
        histórico.
      </p>

      <Button onClick={abrirNovaConta} className="mb-4">
        Nova conta
      </Button>

      {/* Lista de contas */}
      <div className="grid gap-4">
        {contas.map((conta) => (
          <Card key={conta.id} className={conta.ativa ? "" : "opacity-60"}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{conta.nome}</CardTitle>
                <CardDescription>
                  {conta.instituicao} • {tiposConta.find((t) => t.value === conta.tipo)?.label}
                </CardDescription>
              </div>
              <div className="flex gap-2 items-center">
                <span className="text-lg font-bold">
                  R$ {conta.saldoAtual.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
                <span
                  className={`text-xs px-2 py-1 rounded ${conta.ativa ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"}`}
                >
                  {conta.ativa ? "Ativa" : "Inativa"}
                </span>
                <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                  {conta.impacto === "ativo" ? "Ativo" : "Passivo"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4 items-center">
              <div className="text-sm text-muted-foreground">
                Saldo inicial: R${" "}
                {conta.saldoInicial.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em{" "}
                {conta.dataSaldo}
              </div>
              {conta.observacoes && (
                <div className="text-sm text-muted-foreground">{conta.observacoes}</div>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => abrirEditarConta(conta.id)}
                disabled={!conta.ativa}
              >
                Editar
              </Button>
              {conta.ativa && (
                <Button size="sm" variant="destructive" onClick={() => desativarConta(conta.id)}>
                  Desativar
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal de cadastro/edição */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">{editando ? "Editar conta" : "Nova conta"}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome da conta *</label>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Instituição *</label>
                <Input
                  value={form.instituicao}
                  onChange={(e) => setForm({ ...form, instituicao: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tipo *</label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposConta.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Saldo inicial *</label>
                <Input
                  type="number"
                  value={form.saldoInicial}
                  onChange={(e) => setForm({ ...form, saldoInicial: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Data do saldo inicial *</label>
                <Input
                  type="date"
                  value={form.dataSaldo}
                  onChange={(e) => setForm({ ...form, dataSaldo: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Observações</label>
                <Input
                  value={form.observacoes}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button onClick={salvarConta}>
                {editando ? "Salvar alterações" : "Criar conta"}
              </Button>
              <Button variant="outline" onClick={() => setModalAberto(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
