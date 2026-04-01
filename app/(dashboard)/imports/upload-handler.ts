/**
 * Função de upload corrigida para múltiplos arquivos
 */

export async function handleMultipleFileUpload(
  files: File[],
  selectedBank: string,
  selectedMonth: string,
  selectedYear: number,
  toast: any,
  setUploading: (loading: boolean) => void,
  setCurrentSession: (session: any) => void,
  setFiles: (files: File[]) => void,
  setCurrentView: (view: string) => void
) {
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
  const newDocuments: any[] = []

  try {
    // Criar FormData para upload múltiplo
    const formData = new FormData()
    files.forEach(file => formData.append("files", file))
    formData.append("name", `Lote ${selectedBank} - ${selectedMonth}/${selectedYear}`)

    // Fazer upload real para a API
    const response = await fetch("/api/documents", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Erro ao fazer upload")
    }

    const uploadResult = await response.json()

    // Criar documentos para cada arquivo
    uploadResult.documents.forEach((uploadedDoc: any, index: number) => {
      const file = files[index]
      const newDoc = {
        id: uploadedDoc.id,
        name: file.name,
        fileName: file.name,
        fileSize: file.size,
        mimeType: "application/pdf",
        status: uploadedDoc.status,
        createdAt: new Date().toISOString(),
      }
      newDocuments.push(newDoc)
    })

    toast({
      title: "Upload iniciado",
      description: `${files.length} arquivos estão sendo processados...`,
    })

    // Criar nova sessão com todos os documentos
    if (newDocuments.length > 0) {
      setCurrentSession({
        id: Date.now().toString(),
        period: `${selectedMonth}/${selectedYear}`,
        year: selectedYear,
        month: selectedMonth,
        documents: newDocuments,
        status: "PROCESSING",
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
