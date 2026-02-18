import React from "react"
import { Header } from "./Header"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">{children}</main>
    </div>
  )
}
