"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LoginBackgroundEffect } from "@/components/ui/login-background-effect"
import { useToast } from "@/hooks/use-toast"

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (result?.error) {
        const isCredentialsError = result.error === "CredentialsSignin"
        const hint =
          typeof window !== "undefined" && window.location.port !== "3000"
            ? " Confira no .env se NEXTAUTH_URL usa a mesma porta (ex: http://localhost:" +
              window.location.port +
              ")."
            : ""
        toast({
          title: "Erro ao fazer login",
          description: isCredentialsError
            ? "Email ou senha incorretos. Use os usuários de teste abaixo ou confira se rodou o seed (npm run db:seed)." + hint
            : result.error + hint,
          variant: "destructive",
        })
        return
      }

      // Sucesso: forçar navegação com reload para o cookie de sessão ser enviado
      window.location.href = "/dashboard"
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao fazer login",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
      <LoginBackgroundEffect />
      <Card className="w-full max-w-md relative z-10">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="h-12 w-12 rounded-lg bg-primary" />
          </div>
          <CardTitle className="text-center text-2xl">LMG Platform</CardTitle>
          <CardDescription className="text-center">
            Entre com suas credenciais para acessar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="seu@email.com" {...register("email")} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" placeholder="••••••" {...register("password")} />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Não tem uma conta?{" "}
            <Link href="/register" className="text-primary hover:underline">
              Cadastre-se
            </Link>
          </div>
          <div className="mt-6 rounded-lg bg-muted p-4 text-sm">
            <p className="font-semibold mb-2">Usuários de teste:</p>
            <p className="text-muted-foreground">
              <strong>Admin:</strong> admin@lmg.com / admin123
            </p>
            <p className="text-muted-foreground">
              <strong>User:</strong> user@lmg.com / user123
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
