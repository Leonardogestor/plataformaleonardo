import React from "react"

interface ProgressProps {
  value: number
  max: number
}

export function Progress({ value, max }: ProgressProps) {
  const percent = Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="w-full bg-gray-100 rounded h-2">
      <div className="bg-blue-600 h-2 rounded" style={{ width: `${percent}%` }} />
    </div>
  )
}
