import { Card } from "../ui/Card"
import React from "react"

interface ChartCardProps {
  title: string
  children: React.ReactNode
}

export function ChartCard({ title, children }: ChartCardProps) {
  return (
    <Card className="flex flex-col h-full">
      <span className="text-xs text-gray-500 font-medium mb-2">{title}</span>
      <div className="flex-1">{children}</div>
    </Card>
  )
}
