import { type NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("🔐 [AUTH] Tentativa de login:", credentials?.email)
        console.log("🔐 [AUTH] NEXTAUTH_URL:", process.env.NEXTAUTH_URL)
        console.log("🔐 [AUTH] NODE_ENV:", process.env.NODE_ENV)

        if (!credentials?.email || !credentials?.password) {
          console.log("❌ [AUTH] Credenciais faltando")
          throw new Error("Email e senha são obrigatórios")
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          })

          if (!user) {
            console.log("❌ [AUTH] Usuário não encontrado:", credentials.email)
            throw new Error("Credenciais inválidas")
          }

          console.log("✅ [AUTH] Usuário encontrado:", user.email)

          const isPasswordValid = await bcrypt.compare(credentials.password, user.password)

          if (!isPasswordValid) {
            console.log("❌ [AUTH] Senha incorreta para:", credentials.email)
            throw new Error("Credenciais inválidas")
          }

          console.log("✅ [AUTH] Login bem-sucedido:", user.email)

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          }
        } catch (error) {
          console.log("❌ [AUTH] Erro durante autenticação:", error)
          throw error
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
}
