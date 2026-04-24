"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
  Rocket,
  AlertTriangle,
} from "lucide-react"

// ─── Tipos ───────────────────────────────────────────────────────────────────

type TxType = "INCOME" | "EXPENSE" | "TRANSFER" | "INVESTMENT"

interface StagedTx {
  tempId: string
  date: string
  amount: number
  type: TxType
  category: string
  description: string
}

interface FileState {
  id: string
  file: File
  status: "waiting" | "processing" | "done" | "error"
  transactions: StagedTx[]
  error: string | null
}

interface Account {
  id: string
  name: string
  institution: string
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const CATEGORIES = [
  "Alimentação",
  "Transporte",
  "Saúde",
  "Mercado",
  "Lazer",
  "Assinaturas",
  "Moradia",
  "Educação",
  "Investimentos",
  "Salário",
  "Freelance",
  "Outros",
]

const TYPE_LABELS: Record<TxType, string> = {
  INCOME: "Receita",
  EXPENSE: "Despesa",
  TRANSFER: "Transferência",
  INVESTMENT: "Investimento",
}

const TYPE_COLORS: Record<TxType, string> = {
  INCOME: "text-green-600",
  EXPENSE: "text-red-500",
  TRANSFER: "text-blue-500",
  INVESTMENT: "text-purple-600",
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isRowInvalid(tx: StagedTx): boolean {
  return tx.amount <= 0 || !tx.category.trim()
}

function isRowWarning(tx: StagedTx): boolean {
  return tx.category === "Outros"
}

// ─── Sub-componente: linha da tabela de staging ───────────────────────────────

interface StagingRowProps {
  tx: StagedTx
  onChange: (updated: StagedTx) => void
  onDelete: (tempId: string) => void
}

function StagingRow({ tx, onChange, onDelete }: StagingRowProps) {
  const invalid = isRowInvalid(tx)
  const warning = !invalid && isRowWarning(tx)

  const rowClass = invalid
    ? "border-l-4 border-l-red-500 bg-red-50/40 dark:bg-red-950/20"
    : warning
      ? "border-l-4 border-l-yellow-400 bg-yellow-50/40 dark:bg-yellow-950/20"
      : ""

  return (
    <TableRow className={rowClass}>
      {/* Data */}
      <TableCell className="p-1">
        <Input
          type="date"
          value={tx.date}
          onChange={(e) => onChange({ ...tx, date: e.target.value })}
          className="h-7 w-32 text-xs px-1"
        />
      </TableCell>

      {/* Tipo */}
      <TableCell className="p-1">
        <Select value={tx.type} onValueChange={(v) => onChange({ ...tx, type: v as TxType })}>
          <SelectTrigger className="h-7 w-32 text-xs px-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(TYPE_LABELS) as TxType[]).map((t) => (
              <SelectItem key={t} value={t} className="text-xs">
                <span className={TYPE_COLORS[t]}>{TYPE_LABELS[t]}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      {/* Descrição */}
      <TableCell className="p-1 max-w-[200px]">
        <Input
          value={tx.description}
          onChange={(e) => onChange({ ...tx, description: e.target.value })}
          className="h-7 text-xs px-1"
          title={tx.description}
        />
      </TableCell>

      {/* Categoria */}
      <TableCell className="p-1">
        <Select
          value={tx.category}
          onValueChange={(v) => onChange({ ...tx, category: v })}
        >
          <SelectTrigger
            className={`h-7 w-36 text-xs px-1 ${invalid ? "border-red-500" : warning ? "border-yellow-400" : ""}`}
          >
            <SelectValue placeholder="Selecione…" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c} className="text-xs">
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      {/* Valor */}
      <TableCell className="p-1">
        <Input
          type="number"
          min="0.01"
          step="0.01"
          value={tx.amount}
          onChange={(e) => onChange({ ...tx, amount: parseFloat(e.target.value) || 0 })}
          className={`h-7 w-24 text-xs px-1 text-right ${tx.amount <= 0 ? "border-red-500" : ""}`}
        />
      </TableCell>

      {/* Deletar */}
      <TableCell className="p-1 text-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(tx.tempId)}
          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface PdfStagingUploadProps {
  onCommitSuccess?: () => void
}

export function PdfStagingUpload({ onCommitSuccess }: PdfStagingUploadProps) {
  const [open, setOpen] = useState(false)
  const [files, setFiles] = useState<FileState[]>([])
  const [stagedTxs, setStagedTxs] = useState<StagedTx[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isCommitting, setIsCommitting] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>("none")
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Carrega contas do usuário quando o dialog abre
  useEffect(() => {
    if (!open) return
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((data: Account[]) => setAccounts(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [open])

  const resetAll = () => {
    setFiles([])
    setStagedTxs([])
    setSelectedAccountId("none")
  }

  // ── Seleção de arquivos ────────────────────────────────────────────────────

  const addFiles = useCallback((incoming: File[]) => {
    const pdfs = incoming.filter((f) => f.name.toLowerCase().endsWith(".pdf"))
    if (pdfs.length !== incoming.length) {
      toast({ title: "Apenas PDFs são aceitos", variant: "destructive" })
    }
    if (pdfs.length === 0) return

    const newStates: FileState[] = pdfs.map((f) => ({
      id: `${f.name}-${f.size}-${Date.now()}`,
      file: f,
      status: "waiting",
      transactions: [],
      error: null,
    }))
    setFiles((prev) => {
      const existingNames = new Set(prev.map((x) => x.file.name))
      return [...prev, ...newStates.filter((x) => !existingNames.has(x.file.name))]
    })
  }, [toast])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    addFiles(Array.from(e.dataTransfer.files))
  }, [addFiles])

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  // ── Estágio 1 → 2: Processar com IA ───────────────────────────────────────

  const processFiles = async () => {
    const waiting = files.filter((f) => f.status === "waiting")
    if (waiting.length === 0) return

    setIsProcessing(true)
    setFiles((prev) =>
      prev.map((f) => (f.status === "waiting" ? { ...f, status: "processing" } : f))
    )

    const formData = new FormData()
    waiting.forEach((f) => formData.append("files", f.file))

    try {
      const res = await fetch("/api/documents/preview", { method: "POST", body: formData })
      const json = await res.json()

      if (!res.ok) {
        toast({ title: json.error || "Erro ao processar PDFs", variant: "destructive" })
        setFiles((prev) =>
          prev.map((f) =>
            f.status === "processing"
              ? { ...f, status: "error", error: json.error || "Falha" }
              : f
          )
        )
        return
      }

      const fileResults: Array<{
        name: string
        transactions: StagedTx[]
        error: string | null
      }> = json.files

      // Atualiza status de cada arquivo
      setFiles((prev) =>
        prev.map((f) => {
          const result = fileResults.find((r) => r.name === f.file.name)
          if (!result) return f
          return {
            ...f,
            status: result.error ? "error" : "done",
            transactions: result.transactions,
            error: result.error,
          }
        })
      )

      // Acumula transações no staging
      const newTxs = fileResults.flatMap((r) => r.transactions)
      setStagedTxs((prev) => {
        const existingIds = new Set(prev.map((t) => t.tempId))
        return [...prev, ...newTxs.filter((t) => !existingIds.has(t.tempId))]
      })

      const total = newTxs.length
      const errors = fileResults.filter((r) => r.error).length
      if (total > 0) {
        toast({ title: `${total} transação(ões) extraída(s)${errors ? ` — ${errors} arquivo(s) com erro` : ""}` })
      } else {
        toast({ title: "Nenhuma transação encontrada nos arquivos", variant: "destructive" })
      }
    } catch {
      toast({ title: "Erro de conexão ao processar PDFs", variant: "destructive" })
      setFiles((prev) =>
        prev.map((f) =>
          f.status === "processing" ? { ...f, status: "error", error: "Erro de rede" } : f
        )
      )
    } finally {
      setIsProcessing(false)
    }
  }

  // ── Edição inline de transações ────────────────────────────────────────────

  const updateTx = (updated: StagedTx) => {
    setStagedTxs((prev) => prev.map((t) => (t.tempId === updated.tempId ? updated : t)))
  }

  const deleteTx = (tempId: string) => {
    setStagedTxs((prev) => prev.filter((t) => t.tempId !== tempId))
  }

  // ── Estágio 3: Lançamento atômico ─────────────────────────────────────────

  const invalidCount = stagedTxs.filter(isRowInvalid).length
  const canCommit = stagedTxs.length > 0 && invalidCount === 0 && !isCommitting

  const commitTransactions = async () => {
    if (!canCommit) return
    setIsCommitting(true)

    try {
      const res = await fetch("/api/documents/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactions: stagedTxs,
          accountId: selectedAccountId === "none" ? null : selectedAccountId,
        }),
      })
      const json = await res.json()

      if (!res.ok) {
        toast({ title: json.error || "Erro ao lançar transações", variant: "destructive" })
        return
      }

      toast({ title: json.message })
      setOpen(false)
      resetAll()
      onCommitSuccess?.()
    } catch {
      toast({ title: "Erro de conexão ao lançar transações", variant: "destructive" })
    } finally {
      setIsCommitting(false)
    }
  }

  // ── Status badge dos arquivos ──────────────────────────────────────────────

  const FileStatusIcon = ({ status }: { status: FileState["status"] }) => {
    if (status === "processing") return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
    if (status === "done") return <CheckCircle className="h-4 w-4 text-green-500" />
    if (status === "error") return <XCircle className="h-4 w-4 text-red-500" />
    return <FileText className="h-4 w-4 text-muted-foreground" />
  }

  const hasProcessableFiles = files.some((f) => f.status === "waiting")
  const hasStagedTxs = stagedTxs.length > 0

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) resetAll()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Importar PDF
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            Zero-Fault Ingestion — Importar PDFs
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-0 overflow-hidden flex-1 min-h-0">

          {/* ── Estágio 1: Drop zone + lista de arquivos ── */}
          <div className="px-6 pt-4 pb-3 border-b shrink-0 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Estágio 1 — Selecionar Arquivos
            </p>

            {/* Drop zone */}
            <div
              className={`rounded-lg border-2 border-dashed flex flex-col items-center justify-center py-5 gap-2 cursor-pointer transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-7 w-7 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Arraste PDFs aqui ou <span className="text-primary font-medium">clique para selecionar</span>
              </p>
              <p className="text-xs text-muted-foreground">Até 10 arquivos · Máx 10MB cada</p>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf"
                multiple
                className="hidden"
                onChange={(e) => addFiles(Array.from(e.target.files ?? []))}
              />
            </div>

            {/* Lista de arquivos */}
            {files.length > 0 && (
              <div className="space-y-1.5">
                {files.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-1.5 text-sm"
                  >
                    <FileStatusIcon status={f.status} />
                    <span className="flex-1 truncate font-medium">{f.file.name}</span>
                    <span className="text-muted-foreground shrink-0 text-xs">{formatBytes(f.file.size)}</span>
                    {f.status === "done" && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {f.transactions.length} tx
                      </Badge>
                    )}
                    {f.status === "error" && (
                      <span className="text-xs text-red-500 truncate max-w-[160px]">{f.error}</span>
                    )}
                    {f.status === "waiting" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 shrink-0"
                        onClick={(e) => { e.stopPropagation(); removeFile(f.id) }}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <Button
              onClick={processFiles}
              disabled={!hasProcessableFiles || isProcessing}
              className="w-full"
              size="sm"
            >
              {isProcessing ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processando com IA…</>
              ) : (
                <><Upload className="mr-2 h-4 w-4" />Processar com IA</>
              )}
            </Button>
          </div>

          {/* ── Estágio 2: Sandbox de conferência ── */}
          {hasStagedTxs && (
            <div className="flex flex-col flex-1 min-h-0 px-6 pt-4 pb-3">
              <div className="flex items-center justify-between mb-2 shrink-0">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Estágio 2 — Conferência
                </p>
                <div className="flex items-center gap-2">
                  {invalidCount > 0 && (
                    <Badge variant="destructive" className="text-xs gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {invalidCount} erro(s)
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {stagedTxs.length} transação(ões)
                  </Badge>
                </div>
              </div>

              {/* Tabela editável */}
              <div className="flex-1 overflow-auto rounded-md border min-h-0">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead className="py-2 px-1 w-[130px]">Data</TableHead>
                      <TableHead className="py-2 px-1 w-[130px]">Tipo</TableHead>
                      <TableHead className="py-2 px-1">Descrição</TableHead>
                      <TableHead className="py-2 px-1 w-[148px]">Categoria</TableHead>
                      <TableHead className="py-2 px-1 w-[100px] text-right">Valor (R$)</TableHead>
                      <TableHead className="py-2 px-1 w-[40px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stagedTxs.map((tx) => (
                      <StagingRow
                        key={tx.tempId}
                        tx={tx}
                        onChange={updateTx}
                        onDelete={deleteTx}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Legenda */}
              <div className="flex items-center gap-4 mt-2 shrink-0 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Erro (valor zero ou sem categoria)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Revisar (categoria "Outros")
                </span>
              </div>
            </div>
          )}

          {/* ── Estágio 3: Rodapé de lançamento ── */}
          <div className="px-6 py-4 border-t shrink-0 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger className="h-9 w-52 text-sm">
                  <SelectValue placeholder="Conta (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-sm">Sem conta vinculada</SelectItem>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id} className="text-sm">
                      {acc.name} — {acc.institution}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasStagedTxs && invalidCount > 0 && (
                <p className="text-xs text-destructive">
                  Corrija {invalidCount} erro(s) antes de lançar
                </p>
              )}
            </div>

            <Button
              onClick={commitTransactions}
              disabled={!canCommit}
              className="min-w-[200px]"
            >
              {isCommitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Lançando…</>
              ) : (
                <><Rocket className="mr-2 h-4 w-4" />Lançar {stagedTxs.length > 0 ? `${stagedTxs.length} ` : ""}Transações</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
