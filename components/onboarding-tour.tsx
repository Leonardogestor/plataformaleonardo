import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function OnboardingTour({ onClose }: { onClose?: () => void }) {
  const [step, setStep] = useState(0)
  const steps = [
    {
      title: "Bem-vindo à LMG PLATAFORMA FINANCEIRA",
      description:
        "Aqui você tem uma visão completa do seu dinheiro: passado, presente e futuro. Tudo pensado para facilitar decisões e dar autonomia em poucos minutos.",
      cta: "Próximo",
    },
    {
      title: "Como a plataforma pensa",
      description:
        "A plataforma foi construída para pensar como um assessor financeiro.\nPrimeiro, você entende onde está hoje. Depois, ajusta orçamento, metas e decisões do dia a dia. Por fim, visualiza o impacto dessas escolhas no seu futuro financeiro.",
      cta: "Próximo",
    },
    {
      title: "Por onde começar?",
      description:
        "Aqui você enxerga sua vida financeira com clareza para tomar decisões melhores no futuro.\nComece pelo Dashboard para entender onde você está hoje. Depois, ajuste orçamento, metas e cartões conforme sua realidade. Cada etapa foi pensada para orientar suas decisões.",
      cta: "Ver meu panorama",
    },
  ]
  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1)
    } else {
      if (onClose) onClose()
    }
  }
  const currentStep = (steps[step] || steps[0])!
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>{currentStep.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-muted-foreground">{currentStep.description}</p>
          <Button onClick={handleNext} className="w-full">
            {currentStep.cta}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
