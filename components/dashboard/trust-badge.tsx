"use client"

import { Badge } from "@/components/ui/badge"
import { 
  Shield, 
  CheckCircle, 
  AlertTriangle,
  Info
} from "lucide-react"
import { cn } from "@/lib/utils"

interface TrustBadgeProps {
  confidenceLevel: "high" | "medium" | "low"
  size?: "sm" | "md" | "lg"
  showIcon?: boolean
  showText?: boolean
  variant?: "default" | "subtle"
}

export function TrustBadge({ 
  confidenceLevel, 
  size = "sm", 
  showIcon = true, 
  showText = true,
  variant = "default"
}: TrustBadgeProps) {
  const getTrustConfig = (level: string) => {
    switch (level) {
      case "high":
        return {
          icon: <CheckCircle className="h-3 w-3" />,
          text: "Alta Confiança",
          className: "bg-green-100 text-green-800 border-green-200",
          subtleClass: "text-green-600 bg-green-50 border-green-100"
        }
      case "medium":
        return {
          icon: <AlertTriangle className="h-3 w-3" />,
          text: "Confiança Média",
          className: "bg-yellow-100 text-yellow-800 border-yellow-200",
          subtleClass: "text-yellow-600 bg-yellow-50 border-yellow-100"
        }
      case "low":
        return {
          icon: <AlertTriangle className="h-3 w-3" />,
          text: "Baixa Confiança",
          className: "bg-red-100 text-red-800 border-red-200",
          subtleClass: "text-red-600 bg-red-50 border-red-100"
        }
      default:
        return {
          icon: <Info className="h-3 w-3" />,
          text: "Indeterminado",
          className: "bg-gray-100 text-gray-800 border-gray-200",
          subtleClass: "text-gray-600 bg-gray-50 border-gray-100"
        }
    }
  }

  const config = getTrustConfig(confidenceLevel)
  const badgeClass = variant === "subtle" ? config.subtleClass : config.className

  const sizeClass = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5"
  }[size]

  return (
    <Badge 
      variant="outline" 
      className={cn(
        badgeClass,
        sizeClass,
        "flex items-center gap-1 font-medium"
      )}
    >
      {showIcon && config.icon}
      {showText && config.text}
    </Badge>
  )
}
