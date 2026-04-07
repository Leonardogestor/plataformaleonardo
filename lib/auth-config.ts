/**
 * Configuração robusta do NextAuth para produção Vercel
 */

import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"

// Função para obter URL base correta
function getBaseUrl(): string {
  // Em produção, usar a URL do deploy
  if (process.env.NODE_ENV === "production") {
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL
    if (!baseUrl) {
      throw new Error("NEXTAUTH_URL ou VERCEL_URL é obrigatório em produção")
    }
    // Garantir HTTPS e sem trailing slash
    return baseUrl.replace(/^http:/, "https:").replace(/\/$/, "")
  }

  // Em desenvolvimento, usar localhost com porta dinâmica
  const port = process.env.PORT || 3000
  return `http://localhost:${port}`
}

// Configuração de cookies segura para produção
const secureCookies = process.env.NODE_ENV === "production"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email e senha são obrigatórios")
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          })

          if (!user) {
            throw new Error("Credenciais inválidas")
          }

          const isPasswordValid = await bcrypt.compare(credentials.password, user.password)

          if (!isPasswordValid) {
            throw new Error("Credenciais inválidas")
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          }
        } catch (error) {
          // Log sem dados sensíveis
          console.error("[AUTH] Falha na autenticação:", {
            email: credentials.email,
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : "Unknown error",
          })
          throw error
        }
      },
    }),
  ],

  // Configuração de sessão
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },

  // Configuração de JWT
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },

  // Configuração de cookies para produção
  cookies: {
    sessionToken: {
      name: secureCookies ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: secureCookies,
        domain: secureCookies
          ? getBaseUrl()
              .replace(/^https?:\/\//, "")
              .split(":")[0]
          : undefined,
      },
    },
    callbackUrl: {
      name: secureCookies ? "__Secure-next-auth.callback-url" : "next-auth.callback-url",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: secureCookies,
        domain: secureCookies
          ? getBaseUrl()
              .replace(/^https?:\/\//, "")
              .split(":")[0]
          : undefined,
      },
    },
    csrfToken: {
      name: secureCookies ? "__Host-next-auth.csrf-token" : "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: secureCookies,
      },
    },
    pkceCodeVerifier: {
      name: secureCookies
        ? "__Secure-next-auth.pkce.code_verifier"
        : "next-auth.pkce.code_verifier",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: secureCookies,
        domain: secureCookies
          ? getBaseUrl()
              .replace(/^https?:\/\//, "")
              .split(":")[0]
          : undefined,
      },
    },
  },

  // Callbacks
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },

  // Páginas customizadas
  pages: {
    signIn: "/login",
    error: "/login",
  },

  // Debug apenas em desenvolvimento
  debug: process.env.NODE_ENV === "development",
}

// Validação de ambiente
export function validateAuthEnvironment() {
  const baseUrl = getBaseUrl()

  if (!process.env.NEXTAUTH_SECRET || process.env.NEXTAUTH_SECRET.length < 32) {
    throw new Error("NEXTAUTH_SECRET deve ter pelo menos 32 caracteres")
  }

  if (process.env.NODE_ENV === "production" && !baseUrl.startsWith("https://")) {
    throw new Error("Em produção, NEXTAUTH_URL deve começar com https://")
  }

  console.log("[AUTH] Configuração validada:", {
    baseUrl,
    environment: process.env.NODE_ENV,
    secureCookies,
    timestamp: new Date().toISOString(),
  })
}
