import { Card } from "../ui/Card"
import { Progress } from "../ui/Progress"
import React from "react"

interface ProgressCardProps {
  title: string
  value: number
  max: number
}

export function ProgressCard({ title, value, max }: ProgressCardProps) {
  return (
    <Card className="flex flex-col gap-2">
      <span className="text-xs text-gray-500 font-medium">{title}</span>
      <Progress value={value} max={max} />
      <span className="text-sm font-semibold">
        {value} / {max}
      </span>
    </Card>
  )
}
