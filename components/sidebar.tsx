"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useTooltipContext } from "@/components/tooltip-context"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  CreditCard,
  Target,
  TrendingUp,
  BarChart3,
  Settings,
  Brain,
  LineChart,
  FileText,
  ClipboardList,
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Contas", href: "/accounts", icon: Wallet },
  { name: "Transações", href: "/transactions", icon: ArrowLeftRight },
  { name: "Cartões", href: "/cards", icon: CreditCard },
  { name: "Planejamento", href: "/planning", icon: ClipboardList },
  { name: "Metas", href: "/goals", icon: Target },
  { name: "Investimentos", href: "/investments", icon: TrendingUp },
  { name: "Projeções", href: "/projections", icon: LineChart },
  { name: "Documentos", href: "/documents", icon: FileText },
  { name: "Categorização", href: "/categorization", icon: Brain },
  { name: "Relatórios", href: "/reports", icon: BarChart3 },
  { name: "Configurações", href: "/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { enabled, setEnabled, reset } = useTooltipContext()

  return (
    <aside className="flex h-full w-56 flex-col border-r border-border/60 bg-card">
      <div className="flex h-14 items-center border-b border-border/60 px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-white">L</span>
          </div>
          <span className="text-base font-semibold text-foreground">Leo</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-0.5 p-3">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" strokeWidth={2} />
              {item.name}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-border/60 p-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setEnabled(!enabled)}
          className="w-full text-muted-foreground"
        >
          {enabled ? "Sem dicas" : "Dicas"}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full text-muted-foreground">
              Ajuda
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={reset}>Reativar dicas</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
