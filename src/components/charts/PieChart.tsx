"use client"
import { PieChart as RePieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"
import React from "react"

const COLORS = ["#2563eb", "#10b981", "#f59e42", "#ef4444", "#a78bfa"]

interface PieChartProps {
  data: { name: string; value: number }[]
}

export function PieChart({ data }: PieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <RePieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
          {data.map((_entry, idx) => (
            <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </RePieChart>
    </ResponsiveContainer>
  )
}
