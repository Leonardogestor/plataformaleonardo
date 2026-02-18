"use client"
import React, { useState } from "react"
import { organizeWithManus } from "@/src/lib/manus"

export function ManusButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function handleOrganize() {
    setLoading(true)
    setResult(null)
    try {
      const data = await organizeWithManus(
        "Organize meu projeto Next.js para arquitetura limpa e escalável."
      )
      setResult(JSON.stringify(data, null, 2))
    } catch (e) {
      setResult("Erro ao conectar com Manus IA")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="my-4">
      <button
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        onClick={handleOrganize}
        disabled={loading}
      >
        {loading ? "Organizando..." : "Organizar com Manus IA"}
      </button>
      {result && (
        <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto max-h-64">
          {result}
        </pre>
      )}
    </div>
  )
}
