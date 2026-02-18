"use client"
import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"
import React from "react"

interface BarChartProps {
  data: any[]
}

export function BarChart({ data }: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ReBarChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
      </ReBarChart>
    </ResponsiveContainer>
  )
}
