import { Card } from "../ui/Card"
import React from "react"

interface InfoCardProps {
  title: string
  info: string
}

export function InfoCard({ title, info }: InfoCardProps) {
  return (
    <Card className="flex flex-col gap-2">
      <span className="text-xs text-gray-500 font-medium">{title}</span>
      <span className="text-base font-semibold">{info}</span>
    </Card>
  )
}
