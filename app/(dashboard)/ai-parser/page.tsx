import { AITransactionParserDemo } from "@/components/ai/ai-transaction-parser-demo"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "AI Transaction Parser | LMG PLATAFORMA FINANCEIRA",
  description: "Teste o poder da IA para processar dados financeiros desestruturados",
}

export default function AIParserPage() {
  return (
    <div className="container mx-auto py-6">
      <AITransactionParserDemo />
    </div>
  )
}
