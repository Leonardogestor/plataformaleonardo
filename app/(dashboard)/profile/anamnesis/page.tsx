// Deploy fix - 2026-03-30
export default function AnamnesisPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Minha Anámnese Financeira</h1>
        <p className="text-muted-foreground mb-6">
          Análise completa do seu perfil financeiro e estratégias personalizadas
        </p>

        <div className="bg-card p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Anámnese Não Encontrada</h2>
          <p className="text-muted-foreground mb-4">
            Você ainda não completou o formulário estratégico.
          </p>
          <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Completar Anámnese
          </button>
        </div>
      </div>
    </div>
  )
}
