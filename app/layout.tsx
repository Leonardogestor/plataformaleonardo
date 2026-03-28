import { Inter } from "next/font/google"
import "./globals.css"
import { AppProviders } from "@/components/providers/app-providers"
import { GlobalDateProvider } from "@/contexts/global-date-context"
import { ReactQueryProvider } from "@/hooks/use-react-query-setup"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "LMG PLATAFORMA FINANCEIRA",
  description: "Plataforma de gestão financeira",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <body className={inter.className}>
        <ReactQueryProvider>
          <GlobalDateProvider>
            <AppProviders>{children}</AppProviders>
          </GlobalDateProvider>
        </ReactQueryProvider>
      </body>
    </html>
  )
}
