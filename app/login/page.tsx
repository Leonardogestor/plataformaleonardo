"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import Link from "next/link"
import Image from "next/image"
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
  email: z.string().email("Email inválido").max(255, "Email muito longo"),
  password: z
    .string()
    .min(6, "Senha deve ter pelo menos 6 caracteres")
    .max(100, "Senha muito longa"),
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
    console.log("🔐 [LOGIN FRONTEND] Iniciando login com:", data.email)

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      console.log("🔐 [LOGIN FRONTEND] Resultado do signIn:", result)

      if (result?.error) {
        console.log("❌ [LOGIN FRONTEND] Erro no login:", result.error)
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
            ? "Email ou senha incorretos." + hint
            : result.error + hint,
          variant: "destructive",
        })
        return
      }

      console.log("✅ [LOGIN FRONTEND] Login bem-sucedido, redirecionando...")
      // Sucesso: forçar navegação com reload para o cookie de sessão ser enviado
      window.location.href = "/dashboard"
    } catch (error) {
      console.log("❌ [LOGIN FRONTEND] Erro exceção:", error)
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
      <Card
        className="relative z-10 text-white"
        style={{
          maxWidth: "380px",
          width: "100%",
          borderRadius: "20px",
          padding: "28px 24px",
          border: "1px solid rgba(255,255,255,0.06)",
          background: "#000000",
          boxShadow: "0 10px 40px rgba(0,0,0,0.6)",
        }}
      >
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-5">
            <Image src="/logo.png" alt="Logo" width={158} height={40} className="object-contain" />
          </div>
          <CardDescription className="text-center text-gray-300 text-base mb-5">
            Entre com suas credenciais para acessar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="space-y-3">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                {...register("email")}
                className="bg-[#1a1a1a] border-[#2a2a2a] py-4 px-4 focus:border-blue-500"
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-3">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••"
                {...register("password")}
                className="bg-[#1a1a1a] border-[#2a2a2a] py-4 px-4 focus:border-blue-500"
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full mt-5"
              style={{ boxShadow: "0 4px 12px rgba(59,130,246,0.25)" }}
              disabled={isLoading}
            >
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
          <div className="mt-3 text-center text-sm text-gray-400">
            Não tem uma conta?{" "}
            <Link
              href="/register"
              className="text-blue-400 hover:text-blue-300 hover:underline font-medium"
            >
              Cadastre-se
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
