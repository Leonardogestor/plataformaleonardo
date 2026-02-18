import { Card } from "../ui/Card"
import React from "react"

export type KPICardTrend = "up" | "down" | string
interface KPICardProps {
  title: string
  value: string | number
  trend?: KPICardTrend
  color?: string
}

export function KPICard({ title, value, trend, color }: KPICardProps) {
  return (
    <Card className="flex flex-col gap-2">
      <span className="text-xs text-gray-500 font-medium">{title}</span>
      <span className={`text-2xl font-bold ${color ?? "text-gray-900"}`}>{value}</span>
      {trend && (
        <span className={`text-xs ${trend === "up" ? "text-green-600" : "text-red-600"}`}>
          {trend === "up" ? "▲" : "▼"}
        </span>
      )}
    </Card>
  )
}
