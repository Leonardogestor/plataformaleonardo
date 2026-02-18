export async function organizeWithManus(prompt: string, options: Record<string, any> = {}) {
  const res = await fetch("/api/manus", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, ...options }),
  })
  if (!res.ok) throw new Error("Erro ao conectar com Manus IA")
  return res.json()
}
