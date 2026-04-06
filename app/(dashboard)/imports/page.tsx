"use client"

import { useState, useEffect, useCallback } from "react"
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
import {
  Upload,
  FileText,
  Trash2,
  Download,
  Loader2,
  Plus,
  Eye,
  Edit3,
  CheckCircle,
  AlertCircle,
  Clock,
  Calendar,
  Banknote,
  ArrowRight,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { EmptyState } from "@/components/ui/empty-state"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ImportTransactionsEditor } from "@/components/import-transactions-editor-simple"

interface ImportDocument {
  id: string
  name: string
  fileName: string
  mimeType: string
  fileSize: number | null
  status: "PROCESSING" | "COMPLETED" | "FAILED"
  errorMessage: string | null
  createdAt: string
  transactionCount?: number
  extractedText?: string | null
  bankName?: string
  period?: string
}

interface ImportSession {
  id: string
  period: string
  year: number
  month: string
  documents: ImportDocument[]
  status: "SETUP" | "UPLOADING" | "PROCESSING" | "REVIEWING" | "COMPLETED"
  createdAt: string
}

const months = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
]

const banks = [
  "Itaú",
  "Bradesco",
  "Banco do Brasil",
  "Santander",
  "Caixa",
  "Nubank",
  "Inter",
  "PicPay",
  "Mercado Pago",
  "Outro",
]

export default function ImportsPage() {
  const [currentView, setCurrentView] = useState<"LIST" | "SETUP" | "REVIEW">("LIST")
  const [imports, setImports] = useState<ImportSession[]>([])
  const [loading, setLoading] = useState(true)
  const [currentSession, setCurrentSession] = useState<ImportSession | null>(null)
  const [selectedBank, setSelectedBank] = useState("")
  const [selectedMonth, setSelectedMonth] = useState("")
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [processingFiles, setProcessingFiles] = useState<string[]>([])
  const { toast } = useToast()

  const fetchImports = useCallback(async () => {
    try {
      setLoading(true)
      // Buscar importações reais da API
      const response = await fetch("/api/imports")
      if (response.ok) {
        const data = await response.json()
        setImports(data)
      } else {
        setImports([])
      }
    } catch {
      setImports([])
      toast({
        title: "Erro",
        description: "Não foi possível carregar as importações",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchImports()
  }, [fetchImports])

  const startNewImport = () => {
    setCurrentSession({
      id: Date.now().toString(),
      period: "",
      year: new Date().getFullYear(),
      month: "",
      documents: [],
      status: "SETUP",
      createdAt: new Date().toISOString(),
    })
    setCurrentView("SETUP")
  }

  const setupSession = () => {
    if (!selectedMonth || !selectedYear) {
      toast({
        title: "Dados incompletos",
        description: "Selecione o mês e ano da importação.",
        variant: "destructive",
      })
      return
    }

    if (!selectedBank) {
      toast({
        title: "Banco não selecionado",
        description: "Selecione ou informe o banco.",
        variant: "destructive",
      })
      return
    }

    setCurrentSession((prev) =>
      prev
        ? {
            ...prev,
            period: `${selectedMonth} ${selectedYear}`,
            year: selectedYear,
            month: selectedMonth,
            status: "UPLOADING",
          }
        : null
    )

    // Mostrar toast de sucesso e instruir o usuário
    toast({
      title: "Configuração concluída!",
      description: "Agora envie os arquivos PDF dos extratos.",
    })

    // Scroll suave para a seção de upload
    setTimeout(() => {
      document.getElementById("upload-section")?.scrollIntoView({ behavior: "smooth" })
    }, 100)
  }

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (files.length === 0) {
      toast({ title: "Selecione pelo menos um arquivo PDF", variant: "destructive" })
      return
    }

    if (!selectedBank || !selectedMonth || !selectedYear) {
      toast({
        title: "Dados incompletos",
        description: "Selecione o banco, mês e ano antes de enviar os arquivos.",
        variant: "destructive",
      })
      return
    }

    setUploading(true)
    const newDocuments: ImportDocument[] = []

    try {
      // Importar o processador frontend
      const { processMultiplePdfs } = await import("@/components/pdf-processor-frontend")
      
      // Processar PDFs no frontend (100% funcional)
      const results = await processMultiplePdfs(
        files,
        selectedBank,
        selectedMonth,
        selectedYear,
        (fileName, result) => {
          if (result.success) {
            toast({
              title: "Arquivo processado",
              description: `${fileName} - ${result.transactionsProcessed} transações`,
            })
            
            // Adicionar documento na sessão
            newDocuments.push({
              id: result.documentId!,
              name: fileName,
              fileName: fileName,
              fileSize: files.find(f => f.name === fileName)?.size || 0,
              mimeType: "application/pdf",
              status: "COMPLETED",
              createdAt: new Date().toISOString(),
              errorMessage: null
            })
          } else {
            toast({
              title: "Erro no arquivo",
              description: `${fileName} - ${result.error}`,
              variant: "destructive",
            })
          }
        }
      )

      const successCount = results.filter(r => r.success).length
      const failCount = results.filter(r => !r.success).length

      toast({
        title: "Processamento concluído",
        description: `${successCount} arquivos processados, ${failCount} falhas.`,
      })

      // Criar nova sessão com todos os documentos
      if (newDocuments.length > 0) {
        setCurrentSession({
          id: Date.now().toString(),
          period: `${selectedMonth}/${selectedYear}`,
          year: selectedYear,
          month: selectedMonth,
          documents: newDocuments,
          status: "COMPLETED",
          createdAt: new Date().toISOString(),
        })

        // Limpar seleção de arquivos
        setFiles([])
        
        // Mudar para view de processamento
        setCurrentView("PROCESSING")
      }

    } catch (error) {
      console.error("Erro no upload:", error)
      toast({
        title: "Erro no upload",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }
                              ? {
                                  ...doc,
                                  status: "FAILED" as const,
                                  errorMessage: statusData.errorMessage,
                                }
                              : doc
                          ),
                        }
                      : null
                  )
                } else {
                  // Continuar verificando
                  setTimeout(checkProcessingStatus, 2000)
                }
              }
            } catch (error) {
              console.error("Erro ao verificar status:", error)
              setTimeout(checkProcessingStatus, 2000)
            }
          }

          // Iniciar verificação de status
          setTimeout(checkProcessingStatus, 2000)
        } catch (error) {
          console.error("Erro no upload do arquivo:", file.name, error)
          toast({
            title: "Erro no upload",
            description: `Erro ao fazer upload de ${file.name}: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
            variant: "destructive",
          })
          setProcessingFiles((prev) => prev.filter((f) => f !== file.name))
        }
      }

      setCurrentSession((prev) =>
        prev
          ? {
              ...prev,
              documents: [...prev.documents, ...newDocuments],
              status: newDocuments.length > 0 ? "PROCESSING" : "UPLOADING",
            }
          : null
      )

      setFiles([])
      toast({
        title: "Upload iniciado",
        description: `${files.length} arquivo(s) enviados para processamento.`,
      })
    } catch (error) {
      console.error("Erro geral no upload:", error)
      toast({
        title: "Erro no upload",
        description: "Ocorreu um erro ao processar os arquivos.",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const updateDocumentName = (docId: string, newName: string) => {
    setCurrentSession((prev) =>
      prev
        ? {
            ...prev,
            documents: prev.documents.map((doc) =>
              doc.id === docId ? { ...doc, name: newName } : doc
            ),
          }
        : null
    )
  }

  const proceedToReview = () => {
    if (!currentSession) return

    const allCompleted = currentSession.documents.every((doc) => doc.status === "COMPLETED")
    if (!allCompleted) {
      toast({
        title: "Aguarde o processamento",
        description: "Todos os arquivos precisam ser processados antes de revisar.",
        variant: "destructive",
      })
      return
    }

    setCurrentSession((prev) => (prev ? { ...prev, status: "REVIEWING" } : null))
    setCurrentView("REVIEW")
  }

  const saveImport = async () => {
    if (!currentSession) return

    try {
      // 1. Forçar atualização do Dashboard
      await fetch("/api/dashboard/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceUpdate: true })
      })

      // 2. Forçar atualização dos Cartões
      await fetch("/api/cards/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceUpdate: true })
      })

      // 3. Forçar atualização das Metas
      await fetch("/api/goals/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceUpdate: true })
      })

      // 4. Limpar cache do navegador
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map(name => caches.delete(name)))
      }

      const finalSession = { ...currentSession, status: "COMPLETED" as const }
      setImports((prev) => [...prev, finalSession])

      toast({
        title: "Importação concluída!",
        description: "Todas as transações foram salvas e todas as abas foram atualizadas.",
      })

      // 5. Redirecionar para transações para ver o resultado
      window.location.href = "/transactions"

    } catch (error) {
      console.error("Erro ao salvar importação:", error)
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as transações.",
        variant: "destructive",
      })
    }
  }

  const formatSize = (bytes: number | null) => {
    if (bytes == null) return "—"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (currentView === "SETUP" && currentSession) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setCurrentView("LIST")}>
            ← Voltar
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">Nova Importação</h2>
        </div>

        {/* Configuração do Período */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Período da Importação
            </CardTitle>
            <CardDescription>
              Selecione o mês e ano referente aos extratos que serão importados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Mês</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month} value={month}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ano</Label>
                <Select
                  value={selectedYear.toString()}
                  onValueChange={(value) => setSelectedYear(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026, 2027].map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuração do Banco */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5" />
              Banco
            </CardTitle>
            <CardDescription>Selecione o banco dos extratos que serão importados.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Banco</Label>
                <Select value={selectedBank} onValueChange={setSelectedBank}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o banco" />
                  </SelectTrigger>
                  <SelectContent>
                    {banks.map((bank) => (
                      <SelectItem key={bank} value={bank}>
                        {bank}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedBank === "Outro" && (
                <div>
                  <Label>Nome do Banco</Label>
                  <Input placeholder="Informe o nome do banco" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upload dos Arquivos */}
        <Card id="upload-section">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload dos Extratos
            </CardTitle>
            <CardDescription>
              Anexe os arquivos PDF dos extratos bancários. O upload é automático após selecionar os
              arquivos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleFileUpload} className="space-y-4">
              <div>
                <Label>Arquivos PDF</Label>
                <Input
                  type="file"
                  accept=".pdf,application/pdf"
                  multiple
                  onChange={(e) => {
                    const selectedFiles = Array.from(e.target.files || [])
                    setFiles(selectedFiles)
                    // Iniciar upload automaticamente se tiver arquivos
                    if (selectedFiles.length > 0 && selectedBank && selectedMonth && selectedYear) {
                      // Dar um pequeno delay para o estado atualizar
                      setTimeout(() => {
                        handleFileUpload(e as any)
                      }, 100)
                    }
                  }}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Você pode selecionar múltiplos arquivos PDF. O upload começará automaticamente.
                </p>
              </div>

              {files.length > 0 && (
                <div className="space-y-2">
                  <Label>Arquivos selecionados:</Label>
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <span className="text-sm">{file.name}</span>
                      <span className="text-xs text-muted-foreground">{formatSize(file.size)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={files.length === 0 || uploading} className="w-full">
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Enviando {files.length} arquivo(s)...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Enviar Arquivos Manualmente
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Lista de Documentos */}
        {currentSession.documents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Arquivos Enviados</CardTitle>
              <CardDescription>Edite o nome de cada arquivo se necessário.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {currentSession.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 border rounded">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <Input
                        value={doc.name}
                        onChange={(e) => updateDocumentName(doc.id, e.target.value)}
                        className="mb-1"
                      />
                      <p className="text-sm text-muted-foreground">
                        {doc.fileName} • {formatSize(doc.fileSize)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {processingFiles.includes(doc.fileName) ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Processando...
                        </>
                      ) : doc.status === "COMPLETED" ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-emerald-600" /> Concluído
                        </>
                      ) : (
                        <>
                          <Clock className="h-4 w-4 text-blue-600" /> Aguardando
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {currentSession.documents.every((doc) => doc.status === "COMPLETED") && (
                <div className="mt-4">
                  <Button onClick={proceedToReview} className="w-full">
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Revisar Transações
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Botões de Ação */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setCurrentView("LIST")}>
            Cancelar
          </Button>
          {currentSession.status === "SETUP" && (
            <Button
              onClick={setupSession}
              disabled={!selectedMonth || !selectedYear || !selectedBank}
            >
              Próximo
            </Button>
          )}
          {currentSession.status === "UPLOADING" && (
            <Button
              onClick={() => {
                // Mostrar seção de upload se ainda não tiver documentos
                if (currentSession.documents.length === 0) {
                  // Scroll para a seção de upload e focar no input
                  const uploadSection = document.getElementById("upload-section")
                  if (uploadSection) {
                    uploadSection.scrollIntoView({ behavior: "smooth" })
                    // Tentar focar no input de arquivo após um pequeno delay
                    setTimeout(() => {
                      const fileInput = uploadSection.querySelector(
                        'input[type="file"]'
                      ) as HTMLInputElement
                      if (fileInput) {
                        fileInput.focus()
                        // Abrir diálogo de seleção de arquivo
                        fileInput.click()
                      }
                    }, 500)
                  }
                } else {
                  // Se já tem documentos, mostrar botão para continuar
                  setCurrentSession((prev) => (prev ? { ...prev, status: "PROCESSING" } : null))
                }
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {currentSession.documents.length === 0 ? (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Selecionar Arquivos
                </>
              ) : (
                <>
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Continuar
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    )
  }

  if (currentView === "REVIEW" && currentSession) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setCurrentView("SETUP")}>
              ← Voltar
            </Button>
            <h2 className="text-3xl font-bold tracking-tight">Revisão: {currentSession.period}</h2>
          </div>
          <Button onClick={saveImport} size="lg">
            <CheckCircle className="mr-2 h-4 w-4" />
            Salvar Transações
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Resumo da Importação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">Período</Label>
                <p className="font-semibold">{currentSession.period}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Bancos</Label>
                <p className="font-semibold">
                  {currentSession.documents.map((d) => d.bankName).join(", ")}
                </p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Total de Transações</Label>
                <p className="font-semibold">
                  {currentSession.documents.reduce(
                    (sum, doc) => sum + (doc.transactionCount || 0),
                    0
                  )}{" "}
                  transações
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Editor de Transações */}
        {currentSession.documents.map((doc) => (
          <ImportTransactionsEditor key={doc.id} documentId={doc.id} documentName={doc.name} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Importações de PDF</h2>
          <p className="text-muted-foreground">
            Gerencie seus extratos bancários por período e banco.
          </p>
        </div>
        <Button onClick={startNewImport}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Importação
        </Button>
      </div>

      {/* Lista de Importações */}
      <Card>
        <CardHeader>
          <CardTitle>Importações Realizadas</CardTitle>
          <CardDescription>Histórico de importações organizadas por período.</CardDescription>
        </CardHeader>
        <CardContent>
          {imports.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Nenhuma importação"
              description="Comece criando sua primeira importação de extratos."
            />
          ) : (
            <div className="space-y-4">
              {imports.map((importSession) => (
                <div
                  key={importSession.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Calendar className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{importSession.period}</h3>
                        <p className="text-sm text-muted-foreground">
                          {importSession.documents.length} arquivo(s) •{" "}
                          {importSession.documents.reduce(
                            (sum, doc) => sum + (doc.transactionCount || 0),
                            0
                          )}{" "}
                          transações
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            <CheckCircle className="h-3 w-3" />
                            Concluído
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(importSession.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Detalhes
                      </Button>
                    </div>
                  </div>

                  {/* Lista de Documentos */}
                  <div className="mt-4 space-y-2">
                    {importSession.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{doc.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({doc.transactionCount} transações)
                          </span>
                        </div>
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                          {doc.bankName}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
