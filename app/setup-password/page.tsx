"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

const setupPasswordSchema = z
  .object({
    password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres").max(100),
    confirmPassword: z.string().min(6, "Confirme sua senha"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas nao conferem",
    path: ["confirmPassword"],
  })

type SetupPasswordFormData = z.infer<typeof setupPasswordSchema>

export default function SetupPasswordPage() {
  const searchParams = useSearchParams()
  const token = useMemo(() => searchParams.get("token") || "", [searchParams])
  const { toast } = useToast()

  const [isChecking, setIsChecking] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isTokenValid, setIsTokenValid] = useState(false)
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [completed, setCompleted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetupPasswordFormData>({
    resolver: zodResolver(setupPasswordSchema),
  })

  useEffect(() => {
    let active = true

    async function validateToken() {
      if (!token) {
        if (active) {
          setErrorMessage("Link de acesso invalido.")
          setIsChecking(false)
        }
        return
      }

      try {
        const response = await fetch(`/api/auth/setup-password?token=${encodeURIComponent(token)}`)
        const result = await response.json()

        if (!active) return

        if (!response.ok || !result.valid) {
          setIsTokenValid(false)
          setErrorMessage(result.error || "Link de acesso invalido.")
          setIsChecking(false)
          return
        }

        setMaskedEmail(result.email || null)
        setCustomerName(result.name || null)
        setIsTokenValid(true)
        setIsChecking(false)
      } catch (error) {
        if (!active) return
        setErrorMessage("Nao foi possivel validar seu acesso agora.")
        setIsChecking(false)
      }
    }

    validateToken()

    return () => {
      active = false
    }
  }, [token])

  const onSubmit = async (data: SetupPasswordFormData) => {
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/auth/setup-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password: data.password,
          confirmPassword: data.confirmPassword,
        }),
      })

      const result = await response.json()
      if (!response.ok || !result.success) {
        toast({
          title: "Nao foi possivel concluir",
          description: result.error || "Tente novamente em instantes.",
          variant: "destructive",
        })
        return
      }

      setCompleted(true)
      toast({
        title: "Senha definida",
        description: "Seu acesso esta pronto para login.",
      })
    } catch (error) {
      toast({
        title: "Erro",
        description: "Nao foi possivel definir sua senha agora.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">Ativar acesso</CardTitle>
          <CardDescription>
            {isChecking
              ? "Estamos validando seu link de acesso."
              : completed
                ? "Sua senha foi criada com sucesso."
                : "Defina sua senha para entrar na plataforma."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isChecking ? (
            <p className="text-sm text-muted-foreground">Validando link...</p>
          ) : completed ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Seu acesso foi ativado. Agora voce ja pode entrar com seu email e a senha criada.
              </p>
              <Button asChild className="w-full">
                <Link href="/login">Ir para o login</Link>
              </Button>
            </div>
          ) : !isTokenValid ? (
            <div className="space-y-4">
              <p className="text-sm text-destructive">{errorMessage}</p>
              <p className="text-sm text-muted-foreground">
                Se o pagamento acabou de ser aprovado, confira o email enviado pela plataforma ou
                solicite um novo acesso.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/login">Voltar para o login</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                <p>{customerName ? `Acesso para ${customerName}` : "Acesso confirmado"}</p>
                {maskedEmail ? <p>{maskedEmail}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Nova senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Digite sua senha"
                  {...register("password")}
                />
                {errors.password ? (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repita sua senha"
                  {...register("confirmPassword")}
                />
                {errors.confirmPassword ? (
                  <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                ) : null}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : "Definir senha"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
