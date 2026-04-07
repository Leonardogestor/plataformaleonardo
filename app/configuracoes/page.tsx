"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

interface User {
  id: string
  name: string
  email: string
  createdAt: string
}

export default function ConfiguracoesPage() {
  const { data: session } = useSession()
  const { toast } = useToast()

  // Estado do usuário
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Estados dos formulários
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [telefone, setTelefone] = useState("")
  const [editandoEmail, setEditandoEmail] = useState(false)
  const [editandoTelefone, setEditandoTelefone] = useState(false)
  const [salvando, setSalvando] = useState(false)

  // Preferências da plataforma
  const [tema, setTema] = useState("sistema")
  const [moeda, setMoeda] = useState("BRL")
  const [tooltipsAtivos, setTooltipsAtivos] = useState(true)
  const [onboarding, setOnboarding] = useState(false)
  const [visualizacao, setVisualizacao] = useState("cards")
  const [mesInicial, setMesInicial] = useState("janeiro")
  const [periodoRelatorio, setPeriodoRelatorio] = useState("mensal")
  const [agrupamento, setAgrupamento] = useState("mensal")

  // Carregar dados do usuário
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const response = await fetch("/api/user/settings")
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
          setNome(data.user.name)
          setEmail(data.user.email)
        } else {
          const error = await response.json()
          toast({
            title: "Erro",
            description: error.error || "Não foi possível carregar as informações",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error)
        toast({
          title: "Erro",
          description: "Não foi possível carregar as informações",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    if (session?.user) {
      loadUserData()
    }
  }, [session, toast])

  // Salvar email
  const handleSalvarEmail = async () => {
    setSalvando(true)
    try {
      const response = await fetch("/api/user/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setUser(data.user)
        setEditandoEmail(false)
        toast({
          title: "E-mail atualizado",
          description: "Seu e-mail foi alterado com sucesso.",
        })
      } else {
        toast({
          title: "Erro",
          description: data.error || "Não foi possível atualizar o e-mail",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o e-mail",
        variant: "destructive",
      })
    } finally {
      setSalvando(false)
    }
  }

  // Salvar telefone
  const handleSalvarTelefone = () => {
    setEditandoTelefone(false)
    toast({
      title: "Telefone atualizado",
      description: "Seu telefone foi alterado com sucesso.",
    })
  }

  const handleAlterarSenha = () => {
    toast({
      title: "Redefinição de senha",
      description: "Você receberá um e-mail para redefinir sua senha.",
    })
  }

  const handleExportarDados = () => {
    toast({
      title: "Exportação solicitada",
      description: "Você receberá um link para baixar todos os seus dados.",
    })
  }

  const handleExcluirConta = () => {
    if (
      window.confirm(
        "Tem certeza? Esta ação é irreversível e todos os seus dados serão removidos com segurança."
      )
    ) {
      toast({
        title: "Solicitação de exclusão enviada",
        description: "Sua conta será removida em até 7 dias úteis.",
      })
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-96 mb-8"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-8">
      <h1 className="text-4xl font-bold mb-2">Configurações</h1>
      <p className="text-muted-foreground mb-6 text-lg">
        Personalize sua experiência, controle preferências e gerencie sua conta com segurança.
      </p>

      {/* 1️⃣ PERFIL DO USUÁRIO */}
      <Card>
        <CardHeader>
          <CardTitle>Perfil do Usuário</CardTitle>
          <CardDescription>
            Gerencie seus dados pessoais com segurança. Nenhum dado sensível é exibido.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome</label>
            <Input value={nome} disabled />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">E-mail</label>
            {editandoEmail ? (
              <div className="flex gap-2">
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={salvando}
                />
                <Button size="sm" onClick={handleSalvarEmail} disabled={salvando}>
                  {salvando ? "Salvando..." : "Salvar"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditandoEmail(false)}
                  disabled={salvando}
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <div className="flex gap-2 items-center">
                <Input value={email} disabled />
                <Button size="sm" variant="outline" onClick={() => setEditandoEmail(true)}>
                  Editar
                </Button>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Telefone (opcional)</label>
            {editandoTelefone ? (
              <div className="flex gap-2">
                <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} />
                <Button size="sm" onClick={handleSalvarTelefone}>
                  Salvar
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditandoTelefone(false)}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <div className="flex gap-2 items-center">
                <Input value={telefone} disabled placeholder="Não informado" />
                <Button size="sm" variant="outline" onClick={() => setEditandoTelefone(true)}>
                  Editar
                </Button>
              </div>
            )}
          </div>
          <Button variant="secondary" onClick={handleAlterarSenha}>
            Alterar senha
          </Button>
        </CardContent>
      </Card>

      {/* 2️⃣ PREFERÊNCIAS DA PLATAFORMA */}
      <Card>
        <CardHeader>
          <CardTitle>Preferências da Plataforma</CardTitle>
          <CardDescription>
            Defina como prefere visualizar e interagir com a plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tema</label>
              <Select value={tema} onValueChange={setTema}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="claro">Claro</SelectItem>
                  <SelectItem value="escuro">Escuro</SelectItem>
                  <SelectItem value="sistema">Sistema</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Moeda padrão</label>
              <Select value={moeda} onValueChange={setMoeda}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">BRL</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Ocultar dicas de orientação</label>
              <input
                type="checkbox"
                checked={!tooltipsAtivos}
                onChange={() => setTooltipsAtivos((prev) => !prev)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-xs text-muted-foreground block mt-1">
                Você pode reativar as dicas a qualquer momento.
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Reexibir onboarding</label>
              <input
                type="checkbox"
                checked={onboarding}
                onChange={() => setOnboarding((prev) => !prev)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-xs text-muted-foreground block mt-1">
                Mostra novamente o tour de boas-vindas.
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Preferência de visualização</label>
              <Select value={visualizacao} onValueChange={setVisualizacao}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cards">Cards</SelectItem>
                  <SelectItem value="lista">Lista</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3️⃣ PARÂMETROS FINANCEIROS GERAIS */}
      <Card>
        <CardHeader>
          <CardTitle>Parâmetros Financeiros Gerais</CardTitle>
          <CardDescription>
            Defina padrões para relatórios e agrupamentos. Não afeta dados financeiros.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Mês inicial padrão</label>
              <Select value={mesInicial} onValueChange={setMesInicial}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="janeiro">Janeiro</SelectItem>
                  <SelectItem value="fevereiro">Fevereiro</SelectItem>
                  <SelectItem value="março">Março</SelectItem>
                  <SelectItem value="abril">Abril</SelectItem>
                  <SelectItem value="maio">Maio</SelectItem>
                  <SelectItem value="junho">Junho</SelectItem>
                  <SelectItem value="julho">Julho</SelectItem>
                  <SelectItem value="agosto">Agosto</SelectItem>
                  <SelectItem value="setembro">Setembro</SelectItem>
                  <SelectItem value="outubro">Outubro</SelectItem>
                  <SelectItem value="novembro">Novembro</SelectItem>
                  <SelectItem value="dezembro">Dezembro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Período padrão dos relatórios
              </label>
              <Select value={periodoRelatorio} onValueChange={setPeriodoRelatorio}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Forma de agrupamento</label>
              <Select value={agrupamento} onValueChange={setAgrupamento}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4️⃣ INTEGRAÇÕES / IMPORTAÇÕES */}
      <Card>
        <CardHeader>
          <CardTitle>Integrações e Importações</CardTitle>
          <CardDescription>
            Veja o status das integrações conectadas. Nenhuma ação financeira é realizada aqui.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <span className="block text-sm font-medium mb-1">Banco XPTO</span>
              <span className="text-xs text-muted-foreground">
                Última sincronização: 24/01/2026
              </span>
            </div>
            <Button size="sm" variant="outline">
              Atualizar agora
            </Button>
            <Button size="sm" variant="secondary">
              Reconectar
            </Button>
          </div>
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <span className="block text-sm font-medium mb-1">Cartão LMG PLATAFORMA</span>
              <span className="text-xs text-muted-foreground">
                Última sincronização: 22/01/2026
              </span>
            </div>
            <Button size="sm" variant="outline">
              Atualizar agora
            </Button>
            <Button size="sm" variant="secondary">
              Reconectar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 5️⃣ PRIVACIDADE E CONTROLE */}
      <Card>
        <CardHeader>
          <CardTitle>Privacidade e Controle</CardTitle>
          <CardDescription>
            Gerencie sua privacidade e controle total sobre seus dados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" onClick={handleExportarDados}>
            Exportar todos os meus dados
          </Button>
          <Button variant="destructive" onClick={handleExcluirConta}>
            Solicitar exclusão de conta
          </Button>
          <div className="mt-2">
            <a href="/politica-privacidade" className="text-primary underline text-sm">
              Visualizar política de privacidade
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
