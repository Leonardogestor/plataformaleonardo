import React from "react"

export function Header() {
  return (
    <header className="w-full flex items-center justify-between py-4 px-6 border-b border-gray-200 bg-white">
      <h1 className="text-xl font-bold tracking-tight text-gray-900">Dashboard Financeiro</h1>
      <div className="flex items-center gap-4">
        {/* Place for user avatar, notifications, etc. */}
      </div>
    </header>
  )
}
