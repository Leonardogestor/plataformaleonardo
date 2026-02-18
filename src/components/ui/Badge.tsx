import React from "react"

interface BadgeProps {
  children: React.ReactNode
  color?: string
  className?: string
}

export function Badge({ children, color, className }: BadgeProps) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${color ?? "bg-gray-100 text-gray-700"} ${className ?? ""}`}
    >
      {children}
    </span>
  )
}
