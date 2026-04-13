"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

import { useToast } from "@/hooks/use-toast"

// Simulação de acesso admin
const isAdmin = true // Trocar para lógica real de autenticação/role

// Simulação de dados do sistema
const STATUS = {
  ambiente: "produção",
  versao: "1.0.0",
  ultimoDeploy: "2026-01-24 22:10",
  api: "online",
  banco: "online",
  jobs: "ok",
}
const LOGS = [
  {
    tipo: "erro",
    origem: "backend",
    mensagem: "Falha ao sincronizar integração bancária",
    data: "2026-01-25 09:12",
  },
  {
    tipo: "aviso",
    origem: "frontend",
    mensagem: "Usuário tentou exportar relatório sem dados",
    data: "2026-01-25 08:55",
  },
  {
    tipo: "info",
    origem: "backend",
    mensagem: "Backup automático concluído",
    data: "2026-01-25 03:00",
  },
  {
    tipo: "info",
    origem: "integração",
    mensagem: "Nova conta conectada",
    data: "2026-01-24 21:40",
  },
]
const ESTATISTICAS = {
  usuarios: 124,
  contas: 312,
  transacoes: 12890,
  ultimoBackup: "2026-01-25 03:00",
  backupsAtivos: true,
}

type UserWithAccounts = {
  id: string
  name: string
  email: string
  createdAt: string
  accounts: {
    id: string
    name: string
    balance: number
    createdAt: string
  }[]
}

export default function AdminPage() {
  const { toast } = useToast()
  const [flags, setFlags] = useState({ onboarding: true, tooltips: true, exportacoes: true })
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<UserWithAccounts[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState<string | null>(null)
  // Buscar todos os usuários e contas ao carregar
  useEffect(() => {
    const fetchUsers = async () => {
      setUsersLoading(true)
      setUsersError(null)
      try {
        const res = await fetch("/api/admin/users-and-accounts")
        if (!res.ok) throw new Error("Falha ao buscar usuários")
        const data = await res.json()
        setUsers(data.users)
      } catch (err: any) {
        setUsersError(err.message || "Erro ao buscar usuários")
      } finally {
        setUsersLoading(false)
      }
    }
    fetchUsers()
  }, [])

  // Controle de acesso
  useEffect(() => {
    if (!isAdmin) {
      window.location.href = "/" // Redireciona se não for admin
    }
  }, [])

  // Alterar flags globais
  const handleFlag = (flag: string, value: boolean) => {
    if (!window.confirm(`Alterar esta configuração impacta todos os usuários. Deseja continuar?`))
      return
    setFlags((f) => ({ ...f, [flag]: value }))
    toast({
      title: `Flag "${flag}" ${value ? "ativada" : "desativada"}`,
      description: "Alteração registrada e aplicada globalmente.",
    })
    // Aqui logaria a alteração
  }

  // Manutenção
  const handleManutencao = (acao: string) => {
    let msg = ""
    if (acao === "cache") msg = "Limpar cache do sistema (não afeta dados do usuário)"
    if (acao === "recalcular") msg = "Reprocessar cálculos financeiros (pode levar alguns minutos)"
    if (acao === "reindexar") msg = "Reindexar dados globais (pode impactar performance)"
    if (!window.confirm(`Confirma? ${msg}`)) return
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      toast({ title: "Ação concluída", description: msg })
    }, 1500)
  }

  // Exportação admin
  const handleExportar = () => {
    toast({
      title: "Exportação global solicitada",
      description: "Você receberá um link para download dos dados completos.",
    })
  }

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-8">
            {/* 0️⃣ CLIENTES E CONTAS */}
            <Card>
              <CardHeader>
                <CardTitle>Clientes e Contas</CardTitle>
                <CardDescription>Visualize todos os clientes cadastrados e suas contas.</CardDescription>
              </CardHeader>
              <CardContent>
                {usersLoading && <div>Carregando usuários...</div>}
                {usersError && <div className="text-red-600">{usersError}</div>}
                {!usersLoading && !usersError && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border text-sm">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="p-2 border">Nome</th>
                          <th className="p-2 border">Email</th>
                          <th className="p-2 border">Criado em</th>
                          <th className="p-2 border">Contas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50">
                            <td className="p-2 border font-medium">{user.name}</td>
                            <td className="p-2 border">{user.email}</td>
                            <td className="p-2 border">{new Date(user.createdAt).toLocaleDateString()}</td>
                            <td className="p-2 border">
                              <ul className="list-disc ml-4">
                                {user.accounts.length === 0 && <li className="text-gray-400">Nenhuma conta</li>}
                                {user.accounts.map((acc) => (
                                  <li key={acc.id}>
                                    <span className="font-semibold">{acc.name}</span> (R$ {acc.balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })})
                                  </li>
                                ))}
                              </ul>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
      <h1 className="text-4xl font-bold mb-2">Painel Administrativo</h1>
      <p className="text-muted-foreground mb-6 text-lg">
        Governança, saúde e ajustes globais do sistema. Acesso restrito a administradores.
      </p>

      {/* 1️⃣ STATUS DO SISTEMA */}
      <Card>
        <CardHeader>
          <CardTitle>Status do Sistema</CardTitle>
          <CardDescription>Monitore a saúde geral e o ambiente da plataforma.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <span className="font-medium">Ambiente:</span> {STATUS.ambiente}
          </div>
          <div>
            <span className="font-medium">Versão:</span> {STATUS.versao}
          </div>
          <div>
            <span className="font-medium">Último deploy:</span> {STATUS.ultimoDeploy}
          </div>
          <div>
            <span className="font-medium">API:</span>{" "}
            <span className={STATUS.api === "online" ? "text-green-600" : "text-red-600"}>
              {STATUS.api}
            </span>
          </div>
          <div>
            <span className="font-medium">Banco de dados:</span>{" "}
            <span className={STATUS.banco === "online" ? "text-green-600" : "text-red-600"}>
              {STATUS.banco}
            </span>
          </div>
          <div>
            <span className="font-medium">Jobs/Filas:</span> {STATUS.jobs}
          </div>
        </CardContent>
      </Card>

      {/* 2️⃣ LOGS E EVENTOS */}
      <Card>
        <CardHeader>
          <CardTitle>Logs e Eventos Recentes</CardTitle>
          <CardDescription>Últimos eventos críticos do sistema. Apenas leitura.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 max-h-64 overflow-y-auto">
          {LOGS.map((log, i) => (
            <div key={i} className="flex gap-2 items-center text-sm">
              <span
                className={`px-2 py-1 rounded ${log.tipo === "erro" ? "bg-red-100 text-red-800" : log.tipo === "aviso" ? "bg-yellow-100 text-yellow-800" : "bg-blue-100 text-blue-800"}`}
              >
                {log.tipo}
              </span>
              <span className="font-medium">[{log.origem}]</span>
              <span>{log.mensagem}</span>
              <span className="ml-auto text-xs text-muted-foreground">{log.data}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 3️⃣ FLAGS E CONFIGURAÇÕES GLOBAIS */}
      <Card>
        <CardHeader>
          <CardTitle>Flags e Configurações Globais</CardTitle>
          <CardDescription>
            Ative ou desative funcionalidades para todos os usuários. Toda alteração exige
            confirmação e é registrada.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <span>Onboarding</span>
            <input
              type="checkbox"
              checked={flags.onboarding}
              onChange={(e) => handleFlag("onboarding", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-xs text-muted-foreground">
              Exibe o tour de boas-vindas para novos usuários.
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span>Tooltips</span>
            <input
              type="checkbox"
              checked={flags.tooltips}
              onChange={(e) => handleFlag("tooltips", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-xs text-muted-foreground">
              Exibe dicas de orientação em toda a plataforma.
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span>Exportações</span>
            <input
              type="checkbox"
              checked={flags.exportacoes}
              onChange={(e) => handleFlag("exportacoes", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-xs text-muted-foreground">
              Permite exportar relatórios e dados.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 4️⃣ MANUTENÇÃO E UTILIDADES */}
      <Card>
        <CardHeader>
          <CardTitle>Manutenção e Utilidades</CardTitle>
          <CardDescription>
            Ações de manutenção exigem confirmação e exibem impacto antes de executar.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button variant="outline" onClick={() => handleManutencao("cache")} disabled={loading}>
            Limpar cache
          </Button>
          <Button
            variant="outline"
            onClick={() => handleManutencao("recalcular")}
            disabled={loading}
          >
            Reprocessar cálculos globais
          </Button>
          <Button
            variant="outline"
            onClick={() => handleManutencao("reindexar")}
            disabled={loading}
          >
            Reindexar dados
          </Button>
        </CardContent>
      </Card>

      {/* 5️⃣ DADOS E SEGURANÇA */}
      <Card>
        <CardHeader>
          <CardTitle>Dados e Segurança</CardTitle>
          <CardDescription>
            Estatísticas gerais, status de backup e exportação global restrita.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <span className="font-medium">Usuários:</span> {ESTATISTICAS.usuarios}
          </div>
          <div>
            <span className="font-medium">Contas:</span> {ESTATISTICAS.contas}
          </div>
          <div>
            <span className="font-medium">Transações:</span> {ESTATISTICAS.transacoes}
          </div>
          <div>
            <span className="font-medium">Último backup:</span> {ESTATISTICAS.ultimoBackup}
          </div>
          <div>
            <span className="font-medium">Backups automáticos:</span>{" "}
            <span className={ESTATISTICAS.backupsAtivos ? "text-green-600" : "text-red-600"}>
              {ESTATISTICAS.backupsAtivos ? "Ativos" : "Inativos"}
            </span>
          </div>
          <Button variant="outline" onClick={handleExportar}>
            Exportar dados globais
          </Button>
          <a href="/politica-privacidade" className="text-primary underline text-sm block mt-2">
            Visualizar política de retenção de dados
          </a>
        </CardContent>
      </Card>
    </div>
  )
}
