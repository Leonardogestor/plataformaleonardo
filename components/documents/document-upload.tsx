"use client"

import { useCallback, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, FileText, FileSpreadsheet } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface DocumentUploadProps {
  onUpload?: (document: any) => void
}

export function DocumentUpload({ onUpload }: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const { toast } = useToast()

  const handleFile = useCallback(
    async (file: File) => {
      const fileName = file.name.toLowerCase()
      const isPdf = fileName.endsWith('.pdf')
      const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')

      if (!isPdf && !isExcel) {
        toast({
          title: "Formato inválido",
          description: "Por favor, selecione um arquivo PDF ou Excel (XLS, XLSX, CSV)",
          variant: "destructive",
        })
        return
      }

      setIsUploading(true)

      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('name', file.name)

        const response = await fetch('/api/documents', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Erro ao fazer upload')
        }

        const document = await response.json()
        
        toast({
          title: "Arquivo enviado com sucesso!",
          description: `${file.name} está sendo processado.`,
        })

        onUpload?.(document)
      } catch (error) {
        console.error('Upload error:', error)
        toast({
          title: "Erro no upload",
          description: error instanceof Error ? error.message : "Não foi possível enviar o arquivo",
          variant: "destructive",
        })
      } finally {
        setIsUploading(false)
      }
    },
    [onUpload, toast]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)

      const file = e.dataTransfer.files[0]
      if (file) {
        handleFile(file)
      }
    },
    [handleFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleFile(file)
      }
    },
    [handleFile]
  )

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Upload de Extratos Bancários
        </CardTitle>
        <CardDescription>
          Envie seus extratos bancários em PDF ou Excel para importar transações automaticamente
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={`flex min-h-[300px] flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {isUploading ? (
            <div className="text-center">
              <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
              <p className="text-muted-foreground">Enviando arquivo...</p>
            </div>
          ) : (
            <>
              <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">
                Arraste seu arquivo aqui
              </h3>
              <p className="mb-4 text-sm text-muted-foreground">
                ou clique no botão abaixo para selecionar
              </p>
              <input
                type="file"
                accept=".pdf,.xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
                id="document-upload"
              />
              <Button asChild>
                <label htmlFor="document-upload" className="cursor-pointer">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Selecionar Arquivo
                </label>
              </Button>
            </>
          )}
        </div>

        <div className="mt-6 space-y-2 rounded-lg bg-muted p-4">
          <h4 className="font-semibold">Formatos aceitos:</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• PDF: Extratos bancários em formato PDF</li>
            <li>• Excel: Planilhas (.xlsx, .xls) com dados de transações</li>
            <li>• CSV: Arquivos CSV com colunas de transações</li>
          </ul>
          <h4 className="font-semibold mt-4">Tamanho máximo:</h4>
          <p className="text-sm text-muted-foreground">10MB por arquivo</p>
        </div>
      </CardContent>
    </Card>
  )
}
