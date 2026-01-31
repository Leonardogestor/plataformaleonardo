"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

export function OpenFinanceConnect() {
  const handleConnect = () => {
    alert("Integração com Pluggy será implementada em breve")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conectar Banco via Open Finance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Conecte suas contas bancárias de forma segura e sincronize automaticamente suas
          transações.
        </p>
        <Button onClick={handleConnect} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Nova Conexão
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Nenhum banco conectado ainda. Clique no botão acima para conectar sua primeira conta.
        </p>
      </CardContent>
    </Card>
  )
}
