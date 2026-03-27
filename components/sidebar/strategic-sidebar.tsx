"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  LayoutDashboard, 
  Brain, 
  TrendingUp, 
  Target, 
  CreditCard, 
  ArrowRightLeft, 
  PieChart, 
  Settings 
} from "lucide-react"

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Strategy",
    href: "/strategy",
    icon: Brain,
    current: false,
  },
  {
    name: "Projections",
    href: "/projections",
    icon: TrendingUp,
  },
  {
    name: "Goals",
    href: "/goals",
    icon: Target,
  },
  {
    name: "Financial",
    href: "/accounts",
    icon: CreditCard,
    subitems: [
      { name: "Accounts", href: "/accounts" },
      { name: "Cards", href: "/cards" },
    ],
  },
  {
    name: "Movements",
    href: "/transactions",
    icon: ArrowRightLeft,
    subitems: [
      { name: "Transactions", href: "/transactions" },
      { name: "Documents", href: "/documents" },
    ],
  },
  {
    name: "Investments",
    href: "/investments",
    icon: PieChart,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
]

export function StrategicSidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col bg-card">
      <div className="flex h-16 shrink-0 items-center px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">LMG</span>
          </div>
          <span className="font-semibold text-lg">LMG Finance</span>
        </Link>
      </div>
      
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || 
            (item.subitems?.some(sub => pathname === sub.href))
          
          return (
            <div key={item.name}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
                {item.name === "Strategy" && (
                  <span className="ml-auto rounded-full bg-blue-500 text-white text-xs px-2 py-0.5">
                    NEW
                  </span>
                )}
              </Link>
              
              {/* Subitems */}
              {item.subitems && isActive && (
                <div className="ml-6 mt-1 space-y-1">
                  {item.subitems.map((subitem) => (
                    <Link
                      key={subitem.href}
                      href={subitem.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        pathname === subitem.href
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                      {subitem.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </div>
  )
}
