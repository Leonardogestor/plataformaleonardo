"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { 
  Upload, 
  FileText, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  TrendingUp
} from "lucide-react"

interface ParsedInvestment {
  name: string
  type: string
  amount: number
  currentValue: number
  institution: string
  ticker?: string
  acquiredAt: string
  profitability?: number
  quantity?: number
  maturityDate?: string
}

interface UploadResult {
  success: boolean
  investments: ParsedInvestment[]
  errors: string[]
  warnings: string[]
  summary: {
    total: number
    processed: number
    imported: number
    updated: number
  }
}

export function InvestmentDocumentUpload() {
  const [isOpen, setIsOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [result, setResult] = useState<UploadResult | null>(null)
  const { toast } = useToast()

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      // Validate file type
      const validTypes = [
        'application/pdf',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv'
      ]
      
      if (!validTypes.includes(selectedFile.type)) {
        toast({
          title: "Arquivo inválido",
          description: "Por favor, selecione um arquivo PDF, Excel ou CSV",
          variant: "destructive"
        })
        return
      }

      // Validate file size (10MB max)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "O tamanho máximo permitido é 10MB",
          variant: "destructive"
        })
        return
      }

      setFile(selectedFile)
      setResult(null)
    }
  }, [toast])

  const handleUpload = useCallback(async () => {
    if (!file) return

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'investment')

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      const response = await fetch('/api/documents/upload-investments', {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (response.ok) {
        const uploadResult: UploadResult = await response.json()
        setResult(uploadResult)

        toast({
          title: "Upload concluído!",
          description: `${uploadResult.summary.imported} investimentos importados com sucesso`,
        })

        // Refresh the page to show new investments
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Falha no upload')
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: "Erro no upload",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao processar o arquivo",
        variant: "destructive"
      })
    } finally {
      setIsUploading(false)
      setTimeout(() => setUploadProgress(0), 1000)
    }
  }, [file, toast])

  const resetUpload = useCallback(() => {
    setFile(null)
    setResult(null)
    setUploadProgress(0)
  }, [])

  const getFileIcon = () => {
    if (!file) return <Upload className="h-8 w-8" />
    
    if (file.type === 'application/pdf') {
      return <FileText className="h-8 w-8 text-red-500" />
    }
    
    return <FileSpreadsheet className="h-8 w-8 text-green-500" />
  }

  if (!isOpen) {
    return (
      <Button 
        onClick={() => setIsOpen(true)}
        variant="outline"
        className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
      >
        <Upload className="mr-2 h-4 w-4" />
        Importar Extrato
      </Button>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Importar Extrato de Investimentos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Selection */}
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
          <input
            type="file"
            id="investment-file-upload"
            accept=".pdf,.xlsx,.xls,.csv"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />
          <label 
            htmlFor="investment-file-upload" 
            className="cursor-pointer flex flex-col items-center space-y-2"
          >
            {getFileIcon()}
            <div className="text-lg font-medium">
              {file ? file.name : "Clique para selecionar ou arraste o arquivo"}
            </div>
            <p className="text-sm text-muted-foreground">
              PDF, Excel ou CSV (máx. 10MB)
            </p>
          </label>
        </div>

        {/* Upload Progress */}
        {isUploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Processando arquivo...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="w-full" />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="flex-1"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Importar Investimentos
              </>
            )}
          </Button>
          <Button 
            variant="outline" 
            onClick={resetUpload}
            disabled={isUploading}
          >
            Limpar
          </Button>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{result.summary.total}</div>
                <div className="text-sm text-muted-foreground">Total no arquivo</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{result.summary.imported}</div>
                <div className="text-sm text-muted-foreground">Importados</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{result.summary.updated}</div>
                <div className="text-sm text-muted-foreground">Atualizados</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{result.summary.processed}</div>
                <div className="text-sm text-muted-foreground">Processados</div>
              </div>
            </div>

            {/* Success/Error Indicators */}
            <div className="flex items-center gap-2">
              {result.success ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-green-700 font-medium">
                    Importação concluída com sucesso!
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="text-red-700 font-medium">
                    Erros encontrados durante a importação
                  </span>
                </>
              )}
            </div>

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-amber-700">Avisos:</h4>
                <ul className="space-y-1">
                  {result.warnings.map((warning, index) => (
                    <li key={index} className="text-sm text-amber-600 flex items-start gap-2">
                      <span>⚠️</span>
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Errors */}
            {result.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-red-700">Erros:</h4>
                <ul className="space-y-1">
                  {result.errors.map((error, index) => (
                    <li key={index} className="text-sm text-red-600 flex items-start gap-2">
                      <span>❌</span>
                      <span>{error}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Preview of imported investments */}
            {result.investments.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Investimentos importados:</h4>
                <div className="max-h-40 overflow-y-auto border rounded-lg p-2">
                  <div className="space-y-1">
                    {result.investments.slice(0, 5).map((investment, index) => (
                      <div key={index} className="text-sm p-2 bg-muted/50 rounded">
                        <div className="font-medium">{investment.name}</div>
                        <div className="text-muted-foreground">
                          {investment.institution} • {investment.type} • R$ {investment.amount.toLocaleString('pt-BR')}
                        </div>
                      </div>
                    ))}
                    {result.investments.length > 5 && (
                      <div className="text-sm text-muted-foreground text-center p-2">
                        ... e mais {result.investments.length - 5} investimentos
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Formatos suportados:</strong> PDF, Excel (.xlsx, .xls) e CSV</p>
          <p><strong>Estrutura esperada:</strong> Nome do ativo, Tipo, Valor investido, Valor atual, Instituição, Data</p>
          <p><strong>Classificação automática:</strong> O sistema identificará o tipo de ativo e instituição automaticamente</p>
        </div>
      </CardContent>
    </Card>
  )
}
