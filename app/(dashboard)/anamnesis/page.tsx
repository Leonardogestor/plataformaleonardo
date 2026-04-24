"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AnamnesisForm } from "@/components/anamnesis/anamnesis-form"
import { useSession } from "next-auth/react"
import { Loader2, CheckCircle, FileText } from "lucide-react"

interface AnamnesisData {
  id: string
  responses: any
  createdAt: string
  updatedAt: string
}

export default function AnamnesisPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [showForm, setShowForm] = useState(false)
  const [anamnesis, setAnamnesis] = useState<AnamnesisData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user) {
      fetchAnamnesis()
    }
  }, [session])

  const fetchAnamnesis = async () => {
    try {
      console.log("Buscando anamnese...")
      const response = await fetch(`${window.location.origin}/api/user/anamnesis`)
      console.log("Status fetch:", response.status)

      if (response.ok) {
        const data = await response.json()
        console.log("Anamnese encontrada:", data)
        setAnamnesis(data.anamnesis)
      }
    } catch (error) {
      console.error("Error fetching anamnesis:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleFormSubmit = async (formData: any) => {
    try {
      console.log("Enviando anamnese...", formData)

      const response = await fetch(`${window.location.origin}/api/user/anamnesis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      console.log("Status da resposta:", response.status)
      console.log("Response ok:", response.ok)

      if (response.ok) {
        const data = await response.json()
        console.log("Dados recebidos:", data)
        setAnamnesis(data.anamnesis)
        setShowForm(false)
        alert("✅ Anámnese salva com sucesso!")
        // Atualiza dashboard/estratégia imediatamente
        router.refresh()
      } else {
        const errorText = await response.text()
        console.error("Erro na resposta:", errorText)
        alert(`❌ Erro ao salvar: ${response.status} - ${errorText}`)
      }
    } catch (error) {
      console.error("Error saving anamnesis:", error)
      alert(`Erro de conexão: ${error instanceof Error ? error.message : "Erro desconhecido"}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Minha Anámnese Financeira</h1>
            <p className="text-muted-foreground">
              Preencha o formulário estratégico para análise completa do seu perfil financeiro
            </p>
          </div>
          <Button variant="outline" onClick={() => setShowForm(false)}>
            Cancelar
          </Button>
        </div>
        <AnamnesisForm onSubmit={handleFormSubmit} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Minha Anámnese Financeira</h1>
        <p className="text-muted-foreground">
          Análise completa do seu perfil financeiro e estratégias personalizadas
        </p>
      </div>

      {anamnesis ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <CardTitle>Anámnese Completa</CardTitle>
              <Badge variant="secondary" className="ml-auto">
                {new Date(anamnesis.updatedAt).toLocaleDateString("pt-BR")}
              </Badge>
            </div>
            <CardDescription>
              Seu perfil financeiro foi analisado e estratégias personalizadas foram geradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Perfil de Investidor</h4>
                  <p className="text-sm text-muted-foreground">
                    {anamnesis.responses?.riskProfile?.investmentProfile || "Não definido"}
                  </p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Situação Financeira</h4>
                  <p className="text-sm text-muted-foreground">
                    {anamnesis.responses?.financialContext?.financialSituation || "Não definida"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setShowForm(true)} variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Ver Respostas Completas
                </Button>
                <Button onClick={() => setShowForm(true)}>Atualizar Anámnese</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Anámnese Não Encontrada</CardTitle>
            <CardDescription>Você ainda não completou o formulário estratégico.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowForm(true)} className="w-full">
              Completar Anámnese
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
