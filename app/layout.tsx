import { Inter } from "next/font/google"
import "./globals.css"
import { AppProviders } from "@/components/providers/app-providers"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "LMG Platform - Gestão Financeira",
  description: "Plataforma completa de gestão financeira e patrimonial",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className="dark">
      <body className={inter.className}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
