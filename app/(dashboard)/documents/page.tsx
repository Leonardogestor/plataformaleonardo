"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, FileText, Trash2, Download, Loader2, Search, AlertTriangle, Calendar, CheckSquare, Square, FileCheck } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { EmptyState } from "@/components/ui/empty-state"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Document {
  id: string
  name: string
  fileName: string
  mimeType: string
  size?: number | null
  fileSize?: number | null
  status?: "PROCESSING" | "COMPLETED" | "FAILED"
  errorMessage?: string | null
  vencimentoAt: string | null
  extractedText: string | null
  createdAt: string
}

interface AlertasVencimento {
  proximosVencimentos: Document[]
  vencidos: Document[]
}

interface ChecklistItem {
  id?: string
  itemKey: string
  itemLabel: string
  completedAt: string | null
  documentId: string | null
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState("")
  const [alertas, setAlertas] = useState<AlertasVencimento | null>(null)
  const [checklist, setChecklist] = useState<{ year: number; items: ChecklistItem[] } | null>(null)
  const [documentsForChecklist, setDocumentsForChecklist] = useState<Document[]>([])
  const [extractingId, setExtractingId] = useState<string | null>(null)
  const [editDoc, setEditDoc] = useState<Document | null>(null)
  const [editVencimento, setEditVencimento] = useState("")
  const { toast } = useToast()

  const currentYear = new Date().getFullYear()

  const fetchDocuments = useCallback(async () => {
    try {
      const url = searchQuery.trim().length >= 2
        ? `/api/documents?q=${encodeURIComponent(searchQuery.trim())}`
        : "/api/documents"
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setDocuments(data)
      }
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os documentos",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [searchQuery, toast])

  const fetchAlertas = useCallback(async () => {
    try {
      const res = await fetch("/api/documents/alertas-vencimento")
      if (res.ok) setAlertas(await res.json())
    } catch {}
  }, [])

  const fetchChecklist = useCallback(async () => {
    try {
      const [checkRes, docsRes] = await Promise.all([
        fetch(`/api/documents/governance-checklist?year=${currentYear}`),
        fetch("/api/documents"),
      ])
      if (checkRes.ok) setChecklist(await checkRes.json())
      if (docsRes.ok) setDocumentsForChecklist(await docsRes.json())
    } catch {}
  }, [currentYear])

  useEffect(() => {
    setLoading(true)
    fetchDocuments()
  }, [fetchDocuments])

  useEffect(() => {
    fetchAlertas()
    fetchChecklist()
  }, [fetchAlertas, fetchChecklist])

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      toast({ title: "Selecione um arquivo", variant: "destructive" })
      return
    }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("name", name || file.name)
      const res = await fetch("/api/documents", { method: "POST", body: formData })
      if (res.ok) {
        toast({ title: "Documento enviado com sucesso!" })
        setFile(null)
        setName("")
        fetchDocuments()
        fetchAlertas()
      } else {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Falha no envio")
      }
    } catch (err) {
      toast({
        title: "Erro ao enviar",
        description: err instanceof Error ? err.message : "Tente novamente",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleExtract = async (id: string) => {
    setExtractingId(id)
    try {
      const res = await fetch(`/api/documents/${id}/extract`, { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        toast({ title: "Extração concluída", description: `${data.extractedLength || 0} caracteres indexados.` })
        fetchDocuments()
      } else throw new Error()
    } catch {
      toast({ title: "Erro ao extrair texto", variant: "destructive" })
    } finally {
      setExtractingId(null)
    }
  }

  const handleSaveVencimento = async () => {
    if (!editDoc) return
    try {
      const res = await fetch(`/api/documents/${editDoc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vencimentoAt: editVencimento ? new Date(editVencimento).toISOString() : null,
        }),
      })
      if (res.ok) {
        toast({ title: "Data de vencimento atualizada" })
        setEditDoc(null)
        fetchDocuments()
        fetchAlertas()
      } else throw new Error()
    } catch {
      toast({ title: "Erro ao atualizar", variant: "destructive" })
    }
  }

  const handleChecklistToggle = async (itemKey: string, completed: boolean) => {
    try {
      await fetch("/api/documents/governance-checklist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: currentYear, itemKey, completed }),
      })
      fetchChecklist()
    } catch {
      toast({ title: "Erro ao atualizar checklist", variant: "destructive" })
    }
  }

  const handleChecklistDocumentLink = async (itemKey: string, documentId: string | null) => {
    try {
      await fetch("/api/documents/governance-checklist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: currentYear, itemKey, documentId: documentId || null }),
      })
      fetchChecklist()
      if (documentId) toast({ title: "Documento vinculado ao item" })
    } catch {
      toast({ title: "Erro ao vincular documento", variant: "destructive" })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este documento?")) return
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" })
      if (res.ok) {
        toast({ title: "Documento excluído" })
        fetchDocuments()
        fetchAlertas()
        fetchChecklist()
      } else throw new Error()
    } catch {
      toast({ title: "Erro ao excluir", variant: "destructive" })
    }
  }

  const formatSize = (bytes: number | null) => {
    if (bytes == null) return "—"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—"
    return new Date(dateStr).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
  }

  const supportsExtract = (mime: string) =>
  mime === "application/pdf" ||
  mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
  mime === "application/vnd.ms-excel" ||
  mime === "image/jpeg" ||
  mime === "image/png"

  if (loading && documents.length === 0) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Documentos</h2>
        <p className="text-muted-foreground">
          Centralize arquivos financeiros, defina vencimentos e use a busca por conteúdo indexado.
        </p>
      </div>

      {/* Busca por conteúdo indexado */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Busca por conteúdo
          </CardTitle>
          <CardDescription>
            Busca por nome, nome do arquivo ou conteúdo indexado (texto extraído de PDF, Excel e imagens por OCR). Mínimo 2 caracteres.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Buscar nos documentos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchDocuments()}
            className="max-w-md"
          />
          <Button variant="secondary" size="sm" className="mt-2" onClick={() => fetchDocuments()}>
            Buscar
          </Button>
        </CardContent>
      </Card>

      {/* Alertas de vencimento */}
      {alertas && (alertas.vencidos.length > 0 || alertas.proximosVencimentos.length > 0) && (
        <Card className="border-amber-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Alertas de vencimento
            </CardTitle>
            <CardDescription>Documentos com vencimento nos próximos 30 dias ou já vencidos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alertas.vencidos.length > 0 && (
              <div>
                <p className="text-sm font-medium text-destructive mb-1">Vencidos</p>
                <ul className="space-y-1">
                  {alertas.vencidos.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate">{d.name}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="text-destructive">{formatDate(d.vencimentoAt)}</span>
                        <Button variant="ghost" size="sm" className="h-7 px-2" asChild>
                          <a href={`/api/documents/${d.id}/download`} download={d.fileName} target="_blank" rel="noopener noreferrer">Baixar</a>
                        </Button>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {alertas.proximosVencimentos.length > 0 && (
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-1">Próximos 30 dias</p>
                <ul className="space-y-1">
                  {alertas.proximosVencimentos.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate">{d.name}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span>{formatDate(d.vencimentoAt)}</span>
                        <Button variant="ghost" size="sm" className="h-7 px-2" asChild>
                          <a href={`/api/documents/${d.id}/download`} download={d.fileName} target="_blank" rel="noopener noreferrer">Baixar</a>
                        </Button>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Checklist anual governança */}
      {checklist && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              Checklist anual de governança ({checklist.year})
            </CardTitle>
            <CardDescription>Itens recomendados para o ano. Marque quando concluir e vincule o documento comprobatório.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {checklist.items.map((item) => (
                <li key={item.itemKey} className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleChecklistToggle(item.itemKey, !item.completedAt)}
                    className="flex items-center gap-2 text-left"
                  >
                    {item.completedAt ? (
                      <CheckSquare className="h-5 w-5 shrink-0 text-emerald-600" />
                    ) : (
                      <Square className="h-5 w-5 shrink-0 text-muted-foreground" />
                    )}
                    <span className={item.completedAt ? "text-muted-foreground line-through" : ""}>
                      {item.itemLabel}
                    </span>
                  </button>
                  <Select
                    value={item.documentId ?? "__none__"}
                    onValueChange={(v) => handleChecklistDocumentLink(item.itemKey, v === "__none__" ? null : v)}
                  >
                    <SelectTrigger className="w-[220px] shrink-0">
                      <SelectValue placeholder="Vincular documento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {documentsForChecklist.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {item.documentId && (
                    <Button variant="ghost" size="sm" className="h-8 shrink-0" asChild>
                      <a href={`/api/documents/${item.documentId}`} download>Baixar</a>
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Enviar documento */}
      <Card>
        <CardHeader>
          <CardTitle>Enviar documento</CardTitle>
          <CardDescription>PDF, Excel ou imagem (JPEG/PNG). Máximo 10MB. O texto é extraído automaticamente após o envio para permitir busca por conteúdo.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="name">Nome (opcional)</Label>
              <Input
                id="name"
                placeholder="Ex: Fatura janeiro 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="file">Arquivo</Label>
              <Input
                id="file"
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <Button type="submit" disabled={!file || uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="mr-2 h-4 w-4" /> Enviar</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Lista de documentos */}
      <Card>
        <CardHeader>
          <CardTitle>Seus documentos</CardTitle>
          <CardDescription>Lista de arquivos. Defina vencimento, extraia texto para busca ou exclua.</CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Nenhum documento"
              description={searchQuery ? "Nenhum resultado para esta busca." : "Envie seu primeiro PDF ou planilha acima."}
            />
          ) : (
            <ul className="divide-y divide-border">
              {documents.map((doc) => (
                <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{doc.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {doc.fileName} · {formatSize(doc.fileSize ?? doc.size ?? null)} · {formatDate(doc.createdAt)}
                        {doc.status != null && (
                          <span className={doc.status === "FAILED" ? "text-destructive" : doc.status === "PROCESSING" ? "text-muted-foreground" : ""}>
                            · {doc.status === "PROCESSING" ? "Processando..." : doc.status === "FAILED" ? "Falhou" : "Concluído"}
                          </span>
                        )}
                        {doc.vencimentoAt && (
                          <span className="ml-2">Venc.: {formatDate(doc.vencimentoAt)}</span>
                        )}
                        {doc.extractedText != null && doc.extractedText.length > 0 && (
                          <span className="ml-2 text-emerald-600 dark:text-emerald-400">· Indexado</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {supportsExtract(doc.mimeType) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExtract(doc.id)}
                        disabled={extractingId === doc.id}
                      >
                        {extractingId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck className="h-4 w-4" />}
                        {extractingId === doc.id ? "Extraindo..." : "Extrair texto"}
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => { setEditDoc(doc); setEditVencimento(doc.vencimentoAt ? doc.vencimentoAt.slice(0, 10) : ""); }}>
                      <Calendar className="h-4 w-4" />
                      Vencimento
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/api/documents/${doc.id}/download`} download={doc.fileName} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4" /></a>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(doc.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Modal editar vencimento */}
      <Dialog open={!!editDoc} onOpenChange={(open) => !open && setEditDoc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Data de vencimento</DialogTitle>
          </DialogHeader>
          {editDoc && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{editDoc.name}</p>
              <div className="space-y-2">
                <Label>Vencimento (opcional)</Label>
                <Input
                  type="date"
                  value={editVencimento}
                  onChange={(e) => setEditVencimento(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditDoc(null)}>Cancelar</Button>
                <Button onClick={handleSaveVencimento}>Salvar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
