import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"

type Card = {
  id: string
  name: string
  institution: string
  limit: number
  usedLimit: number
  closeDay: number
  dueDay: number
  brand: string
}

export default function CardList() {
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchCards()
  }, [])

  const fetchCards = async () => {
    try {
      const response = await fetch("/api/cards")
      if (response.ok) {
        const data = await response.json()
        setCards(data)
      } else {
        toast({
          title: "Erro ao buscar cartões",
          description: "Não foi possível carregar seus cartões.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Erro ao buscar cartões:", error)
      toast({
        title: "Erro de conexão",
        description: "Verifique sua conexão com a internet.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => {}}>Novo Cartão</Button>
      </div>
      {loading ? (
        <div>Carregando cartões...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : cards.length === 0 ? (
        <div className="text-muted-foreground">Nenhum cartão encontrado.</div>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {cards.map((card) => (
            <Card key={card.id} className="cursor-pointer group" onClick={() => onSelect(card.id)}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{card.name}</CardTitle>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-bold ${card.status === "ok" ? "bg-green-100 text-green-800" : card.status === "alert" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}
                >
                  {card.status === "ok" ? "🟢" : card.status === "alert" ? "🟡" : "🔴"}
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">{card.institution}</div>
                <div className="mt-2 flex flex-col gap-1">
                  <div>
                    Limite: <b>R$ {card.limit.toLocaleString()}</b>
                  </div>
                  <div>
                    Utilizado: <b>R$ {card.used.toLocaleString()}</b>
                  </div>
                  <div>
                    Disponível: <b>R$ {(card.limit - card.used).toLocaleString()}</b>
                  </div>
                  <div>Fechamento: dia {card.closeDay}</div>
                  <div>Vencimento: dia {card.dueDay}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
