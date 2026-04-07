"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { User, Lock, Trash2, Download, AlertTriangle, Mail, Calendar, FileText } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const profileSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(6, "Senha atual é obrigatória"),
    newPassword: z.string().min(6, "Nova senha deve ter pelo menos 6 caracteres"),
    confirmPassword: z.string().min(6, "Confirmação é obrigatória"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  })

type ProfileFormData = z.infer<typeof profileSchema>
type PasswordFormData = z.infer<typeof passwordSchema>

export default function SettingsPage() {
  const { update } = useSession()
  const { toast } = useToast()
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)
  const [isLoadingPassword, setIsLoadingPassword] = useState(false)
  const [isLoadingDelete, setIsLoadingDelete] = useState(false)
  const [userInfo, setUserInfo] = useState<any>(null)
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString())
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())
  const [isExporting, setIsExporting] = useState(false)

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  })

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  })

  const fetchUserInfo = useCallback(async () => {
    try {
      const response = await fetch("/api/settings")
      if (response.ok) {
        const data = await response.json()
        setUserInfo(data)
        profileForm.setValue("name", data.name)
        profileForm.setValue("email", data.email)
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar as informações",
        variant: "destructive",
      })
    }
  }, [profileForm, toast])
  useEffect(() => {
    fetchUserInfo()
  }, [fetchUserInfo])

  const onSubmitProfile = async (data: ProfileFormData) => {
    setIsLoadingProfile(true)
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "profile", ...data }),
      })

      if (response.ok) {
        const updatedUser = await response.json()
        setUserInfo(updatedUser)
        await update()
        toast({
          title: "Perfil atualizado!",
          description: "Suas informações foram atualizadas com sucesso",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Erro",
          description: error.error || "Erro ao atualizar perfil",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao atualizar o perfil",
        variant: "destructive",
      })
    } finally {
      setIsLoadingProfile(false)
    }
  }

  const onSubmitPassword = async (data: PasswordFormData) => {
    setIsLoadingPassword(true)
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "password", ...data }),
      })

      if (response.ok) {
        toast({
          title: "Senha atualizada!",
          description: "Sua senha foi alterada com sucesso",
        })
        passwordForm.reset()
      } else {
        const error = await response.json()
        toast({
          title: "Erro",
          description: error.error || "Erro ao atualizar senha",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao atualizar a senha",
        variant: "destructive",
      })
    } finally {
      setIsLoadingPassword(false)
    }
  }

  const handleDeleteAccount = async () => {
    setIsLoadingDelete(true)
    try {
      const response = await fetch("/api/settings", {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Conta excluída",
          description: "Sua conta foi excluída com sucesso",
        })
        await signOut({ callbackUrl: "/login" })
      } else {
        toast({
          title: "Erro",
          description: "Erro ao excluir conta",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao excluir a conta",
        variant: "destructive",
      })
    } finally {
      setIsLoadingDelete(false)
    }
  }

  const handleExportData = async (reportType: "monthly" | "annual") => {
    setIsExporting(true)
    try {
      toast({
        title: "Gerando PDF...",
        description: "Preparando seu relatório para download",
      })

      const params = new URLSearchParams({
        type: "report",
        reportType,
        format: "pdf",
        year: selectedYear,
      })

      if (reportType === "monthly") {
        params.append("month", selectedMonth)
      }

      const response = await fetch(`/api/export?${params.toString()}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        const filename =
          reportType === "monthly"
            ? `relatorio_mensal_${selectedMonth}_${selectedYear}.pdf`
            : `relatorio_anual_${selectedYear}.pdf`
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        toast({
          title: "Relatório gerado!",
          description: "O arquivo PDF foi baixado com sucesso",
        })
      } else {
        throw new Error("Erro ao gerar relatório")
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível gerar o relatório PDF",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Configurações</h2>
        <p className="text-muted-foreground">Gerencie as preferências da sua conta</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock className="h-4 w-4 mr-2" />
            Segurança
          </TabsTrigger>
          <TabsTrigger value="data">
            <Download className="h-4 w-4 mr-2" />
            Dados
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Perfil</CardTitle>
              <CardDescription>Atualize suas informações pessoais</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {userInfo && (
                <div className="flex items-center gap-4 p-4 bg-muted rounded-lg mb-4">
                  <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold">
                    {userInfo.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{userInfo.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {userInfo.email}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={userInfo.role === "ADMIN" ? "default" : "secondary"}>
                        {userInfo.role === "ADMIN" ? "Administrador" : "Usuário"}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        Membro desde {new Date(userInfo.createdAt).toLocaleDateString("pt-BR")}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input id="name" {...profileForm.register("name")} placeholder="Seu nome" />
                  {profileForm.formState.errors.name && (
                    <p className="text-sm text-destructive">
                      {profileForm.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...profileForm.register("email")}
                    placeholder="seu@email.com"
                  />
                  {profileForm.formState.errors.email && (
                    <p className="text-sm text-destructive">
                      {profileForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <Button type="submit" disabled={isLoadingProfile}>
                  {isLoadingProfile ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alterar Senha</CardTitle>
              <CardDescription>Atualize sua senha para manter sua conta segura</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Senha Atual</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    {...passwordForm.register("currentPassword")}
                    placeholder="••••••"
                  />
                  {passwordForm.formState.errors.currentPassword && (
                    <p className="text-sm text-destructive">
                      {passwordForm.formState.errors.currentPassword.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova Senha</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    {...passwordForm.register("newPassword")}
                    placeholder="••••••"
                  />
                  {passwordForm.formState.errors.newPassword && (
                    <p className="text-sm text-destructive">
                      {passwordForm.formState.errors.newPassword.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    {...passwordForm.register("confirmPassword")}
                    placeholder="••••••"
                  />
                  {passwordForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive">
                      {passwordForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <Button type="submit" disabled={isLoadingPassword}>
                  {isLoadingPassword ? "Atualizando..." : "Atualizar Senha"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Zona de Perigo</CardTitle>
              <CardDescription>Ações irreversíveis relacionadas à sua conta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <h4 className="font-medium">Excluir Conta</h4>
                  <p className="text-sm text-muted-foreground">
                    Excluir permanentemente sua conta e todos os dados associados. Esta ação não
                    pode ser desfeita.
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir Conta
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        Tem certeza absoluta?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. Isso excluirá permanentemente sua conta e
                        removerá todos os seus dados dos nossos servidores, incluindo:
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>Todas as suas transações</li>
                          <li>Contas bancárias e cartões</li>
                          <li>Investimentos e metas</li>
                          <li>Conexões bancárias</li>
                          <li>Configurações e preferências</li>
                        </ul>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={isLoadingDelete}
                      >
                        {isLoadingDelete ? "Excluindo..." : "Sim, excluir minha conta"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Exportar Relatórios</CardTitle>
              <CardDescription>
                Baixe seus dados financeiros em formato PDF para análise completa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Período Selection */}
              <div className="space-y-4">
                <h4 className="font-medium">Selecionar Período</h4>
                <div className="flex gap-4 items-end">
                  <div className="space-y-2">
                    <Label htmlFor="month">Mês</Label>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger id="month" className="w-32">
                        <SelectValue placeholder="Mês" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Janeiro</SelectItem>
                        <SelectItem value="2">Fevereiro</SelectItem>
                        <SelectItem value="3">Março</SelectItem>
                        <SelectItem value="4">Abril</SelectItem>
                        <SelectItem value="5">Maio</SelectItem>
                        <SelectItem value="6">Junho</SelectItem>
                        <SelectItem value="7">Julho</SelectItem>
                        <SelectItem value="8">Agosto</SelectItem>
                        <SelectItem value="9">Setembro</SelectItem>
                        <SelectItem value="10">Outubro</SelectItem>
                        <SelectItem value="11">Novembro</SelectItem>
                        <SelectItem value="12">Dezembro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="year">Ano</Label>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger id="year" className="w-32">
                        <SelectValue placeholder="Ano" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 5 }, (_, i) => {
                          const year = new Date().getFullYear() + 2 - i // 2026, 2025, 2024, 2023, 2022
                          return (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Export Options */}
              <div className="space-y-4">
                <h4 className="font-medium">Tipo de Relatório</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-start justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <h5 className="font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Relatório Mensal
                      </h5>
                      <p className="text-sm text-muted-foreground">
                        Análise detalhada das finanças do mês selecionado com insights e
                        recomendações.
                      </p>
                    </div>
                    <Button
                      onClick={() => handleExportData("monthly")}
                      disabled={isExporting}
                      className="shrink-0"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {isExporting ? "Gerando..." : "Exportar PDF"}
                    </Button>
                  </div>

                  <div className="flex items-start justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <h5 className="font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Relatório Anual
                      </h5>
                      <p className="text-sm text-muted-foreground">
                        Visão completa do ano selecionado com comparações mensais e tendências.
                      </p>
                    </div>
                    <Button
                      onClick={() => handleExportData("annual")}
                      disabled={isExporting}
                      className="shrink-0"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {isExporting ? "Gerando..." : "Exportar PDF"}
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-medium">O que está incluído?</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Resumo financeiro completo</li>
                  <li>Análise de categorias</li>
                  <li>Insights personalizados</li>
                  <li>Benchmarking comparativo</li>
                  <li>Recomendações estratégicas</li>
                  <li>Gráficos e visualizações</li>
                </ul>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  💡 <strong>Dica:</strong> Os relatórios em PDF são ideais para compartilhar com
                  consultores financeiros ou para arquivo pessoal. Selecione o período desejado para
                  obter análises específicas.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Privacidade e Segurança</CardTitle>
              <CardDescription>Informações sobre como seus dados são tratados</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">🔒 Criptografia</h4>
                  <p className="text-muted-foreground">
                    Todas as senhas são criptografadas usando bcrypt com salt rounds. Conexões
                    bancárias via Open Finance usam tokens seguros.
                  </p>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2">🛡️ Proteção de Dados</h4>
                  <p className="text-muted-foreground">
                    Seus dados financeiros são armazenados de forma segura e nunca são
                    compartilhados com terceiros sem sua autorização explícita.
                  </p>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2">🔑 Autenticação</h4>
                  <p className="text-muted-foreground">
                    Utilizamos NextAuth.js com JWT tokens para gerenciar sessões de forma segura.
                    Tokens expiram após 30 dias de inatividade.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
