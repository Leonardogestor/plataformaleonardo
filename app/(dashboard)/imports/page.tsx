"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Upload, FileText, RefreshCw, Trash2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function ImportsPage() {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [selectedBank, setSelectedBank] = useState("")
  const [selectedMonth, setSelectedMonth] = useState("")
  const [selectedYear, setSelectedYear] = useState("")
  const [processedData, setProcessedData] = useState<any[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    try {
      const res = await fetch("/api/documents")
      if (res.ok) {
        const data = await res.json()
        setProcessedData(Array.isArray(data) ? data : data.documents || [])
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(Array.from(e.target.files))
    }
  }

  const handleUpload = async () => {
    if (files.length === 0) {
      toast({ title: "Selecione um arquivo", variant: "destructive" })
      return
    }
    setUploading(true)
    try {
      const formData = new FormData()
      files.forEach((f) => formData.append("files", f))
      if (selectedBank) formData.append("bank", selectedBank)
      if (selectedMonth) formData.append("month", selectedMonth)
      if (selectedYear) formData.append("year", selectedYear)

      const res = await fetch("/api/documents", { method: "POST", body: formData })
      if (!res.ok) {
        const e = await res.json()
        throw new Error(e.error || "Erro no upload")
      }

      const result = await res.json()
      toast({ title: "Processando...", description: result.message })
      await loadDocuments()
      setFiles([])
    } catch (e) {
      toast({
        title: "Erro no upload",
        description: e instanceof Error ? e.message : "Erro",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este documento?")) return
    setDeletingId(id)
    try {
      await fetch(`/api/documents/${id}`, { method: "DELETE" })
      setProcessedData((prev) => prev.filter((d) => d.id !== id))
      toast({ title: "Documento excluido" })
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
      setProcessedData([])
      toast({ title: "Todos os documentos excluidos" })
    } catch {
      toast({ title: "Erro ao excluir", variant: "destructive" })
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Importacao de Documentos</h1>
          <p className="text-muted-foreground">
            Importe extratos bancarios e documentos financeiros
          </p>
        </div>
        <Button onClick={loadDocuments} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload de Arquivos
          </CardTitle>
          <CardDescription>Selecione arquivos PDF ou Excel para importar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Banco (opcional)</Label>
              <Select value={selectedBank} onValueChange={setSelectedBank}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o banco" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nubank">Nubank</SelectItem>
                  <SelectItem value="itau">Itau</SelectItem>
                  <SelectItem value="bradesco">Bradesco</SelectItem>
                  <SelectItem value="santander">Santander</SelectItem>
                  <SelectItem value="bb">Banco do Brasil</SelectItem>
                  <SelectItem value="caixa">Caixa</SelectItem>
                  <SelectItem value="inter">Inter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mes (opcional)</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o mes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="01">Janeiro</SelectItem>
                  <SelectItem value="02">Fevereiro</SelectItem>
                  <SelectItem value="03">Marco</SelectItem>
                  <SelectItem value="04">Abril</SelectItem>
                  <SelectItem value="05">Maio</SelectItem>
                  <SelectItem value="06">Junho</SelectItem>
                  <SelectItem value="07">Julho</SelectItem>
                  <SelectItem value="08">Agosto</SelectItem>
                  <SelectItem value="09">Setembro</SelectItem>
                  <SelectItem value="10">Outubro</SelectItem>
                  <SelectItem value="11">Novembro</SelectItem>
                  <SelectItem value="12">Dezembro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ano (opcional)</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2026">2026</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Arquivos</Label>
            <Input
              type="file"
              multiple
              accept=".pdf,.xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
          </div>

          {files.length > 0 && (
            <div className="space-y-1">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4" />
                  {f.name} ({(f.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              ))}
            </div>
          )}

          <Button onClick={handleUpload} disabled={uploading} className="w-full">
            {uploading ? "Processando..." : "Importar Arquivos"}
          </Button>
        </CardContent>
      </Card>

      {processedData.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Nenhum documento encontrado</p>
          <p className="text-sm">Faca upload de um arquivo PDF para comecar</p>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Documentos ({processedData.length})</CardTitle>
              <Button
                onClick={handleDeleteAll}
                variant="outline"
                size="sm"
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Todos
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {processedData.map((doc, i) => (
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
                        ? "Concluido"
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
