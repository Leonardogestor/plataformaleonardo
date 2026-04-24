"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, RefreshCw, Trash2, Upload } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { PdfStagingUpload } from "@/components/documents/pdf-staging-upload"

interface DocRecord {
  id: string
  name: string
  fileName: string
  status: string
  errorMessage?: string | null
}

export default function ImportsPage() {
  const [docs, setDocs] = useState<DocRecord[]>([])
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadDocuments = useCallback(async () => {
    setLoadingDocs(true)
    try {
      const res = await fetch("/api/documents")
      if (res.ok) {
        const data = await res.json()
        setDocs(Array.isArray(data) ? data : data.documents ?? [])
      }
    } catch {
      // silencioso
    } finally {
      setLoadingDocs(false)
    }
  }, [])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este documento?")) return
    setDeletingId(id)
    try {
      await fetch(`/api/documents/${id}`, { method: "DELETE" })
      setDocs((prev) => prev.filter((d) => d.id !== id))
      toast({ title: "Documento excluído" })
    } catch {
      toast({ title: "Erro ao excluir", variant: "destructive" })
    } finally {
      setDeletingId(null)
    }
  }

  const handleDeleteAll = async () => {
    if (!confirm("Excluir todos os documentos?")) return
    try {
      await fetch("/api/documents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      setDocs([])
      toast({ title: "Todos os documentos excluídos" })
    } catch {
      toast({ title: "Erro ao excluir", variant: "destructive" })
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Importação de Documentos</h1>
          <p className="text-muted-foreground">
            Importe extratos bancários em PDF para importar transações automaticamente
          </p>
        </div>
        <Button onClick={loadDocuments} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Upload via Zero-Fault Ingestion (preview → revisão → commit) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Enviar Extrato Bancário (PDF)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PdfStagingUpload
            onCommitSuccess={() => {
              toast({ title: "Transações lançadas com sucesso!" })
              loadDocuments()
            }}
          />
        </CardContent>
      </Card>

      {/* Histórico de documentos */}
      {loadingDocs ? (
        <div className="text-center py-8 text-muted-foreground">Carregando documentos...</div>
      ) : docs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Nenhum documento encontrado</p>
          <p className="text-sm">Faça upload de um extrato PDF para começar</p>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Documentos importados ({docs.length})</CardTitle>
              <Button onClick={handleDeleteAll} variant="outline" size="sm" className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Todos
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {docs.map((doc, i) => (
                <div
                  key={doc.id || i}
                  className="border rounded-lg p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold">{doc.name}</p>
                    <p className="text-sm text-muted-foreground">{doc.fileName}</p>
                    {doc.errorMessage && (
                      <p className="text-sm text-red-600 mt-1">{doc.errorMessage}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        doc.status === "COMPLETED"
                          ? "bg-green-100 text-green-800"
                          : doc.status === "PROCESSING"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                      }`}
                    >
                      {doc.status === "COMPLETED"
                        ? "Concluído"
                        : doc.status === "PROCESSING"
                          ? "Processando"
                          : "Falhou"}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600"
                      disabled={deletingId === doc.id}
                      onClick={() => handleDelete(doc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
