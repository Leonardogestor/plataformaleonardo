"use client"
import {
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"
import React from "react"

interface LineChartProps {
  data: any[]
}

export function LineChart({ data }: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ReLineChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={false} />
      </ReLineChart>
    </ResponsiveContainer>
  )
}
