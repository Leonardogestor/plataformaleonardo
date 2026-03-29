"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { User, MapPin, Briefcase, Calendar, DollarSign, Target } from "lucide-react"

interface UserProfile {
  name: string
  age: string
  gender: string
  location: string
  isEmployed: boolean
  employmentType: string
  monthlyIncome: string
  hasInvestments: boolean
  investmentGoals: string[]
  riskProfile: string
}

export default function ProfileSetup() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [profile, setProfile] = useState<Partial<UserProfile>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const totalSteps = 4

  const updateProfile = (field: keyof UserProfile, value: any) => {
    setProfile(prev => ({ ...prev, [field]: value }))
  }

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    } else {
      handleSubmit()
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      })

      if (response.ok) {
        router.push('/dashboard')
      } else {
        throw new Error('Erro ao salvar perfil')
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informações Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  value={profile.name || ''}
                  onChange={(e) => updateProfile('name', e.target.value)}
                  placeholder="Seu nome completo"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="age">Idade</Label>
                  <Input
                    id="age"
                    type="number"
                    value={profile.age || ''}
                    onChange={(e) => updateProfile('age', e.target.value)}
                    placeholder="Sua idade"
                  />
                </div>
                
                <div>
                  <Label htmlFor="gender">Gênero</Label>
                  <Select value={profile.gender || ''} onValueChange={(value) => updateProfile('gender', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Masculino</SelectItem>
                      <SelectItem value="female">Feminino</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="location">Cidade/Estado</Label>
                <Input
                  id="location"
                  value={profile.location || ''}
                  onChange={(e) => updateProfile('location', e.target.value)}
                  placeholder="Ex: São Paulo, SP"
                />
              </div>
            </CardContent>
          </Card>
        )

      case 2:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Situação Profissional
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isEmployed"
                  checked={profile.isEmployed || false}
                  onCheckedChange={(checked) => updateProfile('isEmployed', checked)}
                />
                <Label htmlFor="isEmployed">Estou trabalhando atualmente</Label>
              </div>

              {profile.isEmployed && (
                <>
                  <div>
                    <Label htmlFor="employmentType">Tipo de Emprego</Label>
                    <Select value={profile.employmentType || ''} onValueChange={(value) => updateProfile('employmentType', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clt">CLT</SelectItem>
                        <SelectItem value="pj">PJ</SelectItem>
                        <SelectItem value="business">Empresário</SelectItem>
                        <SelectItem value="freelancer">Freelancer</SelectItem>
                        <SelectItem value="government">Servidor Público</SelectItem>
                        <SelectItem value="other">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="monthlyIncome">Renda Mensal (R$)</Label>
                    <Input
                      id="monthlyIncome"
                      type="number"
                      value={profile.monthlyIncome || ''}
                      onChange={(e) => updateProfile('monthlyIncome', e.target.value)}
                      placeholder="Ex: 5000"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )

      case 3:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Investimentos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasInvestments"
                  checked={profile.hasInvestments || false}
                  onCheckedChange={(checked) => updateProfile('hasInvestments', checked)}
                />
                <Label htmlFor="hasInvestments">Já possuo investimentos</Label>
              </div>

              <div>
                <Label>Objetivos Financeiros (marque todos que aplicam)</Label>
                <div className="space-y-2 mt-2">
                  {[
                    'Aposentadoria',
                    'Comprar imóvel',
                    'Viagem',
                    'Educação',
                    'Reserva de emergência',
                    'Carro próprio',
                    'Independência financeira'
                  ].map(goal => (
                    <div key={goal} className="flex items-center space-x-2">
                      <Checkbox
                        id={goal}
                        checked={profile.investmentGoals?.includes(goal) || false}
                        onCheckedChange={(checked) => {
                          const goals = profile.investmentGoals || []
                          if (checked) {
                            updateProfile('investmentGoals', [...goals, goal])
                          } else {
                            updateProfile('investmentGoals', goals.filter(g => g !== goal))
                          }
                        }}
                      />
                      <Label htmlFor={goal}>{goal}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )

      case 4:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Perfil de Risco
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Como você se considera em relação a investimentos?</Label>
                <Select value={profile.riskProfile || ''} onValueChange={(value) => updateProfile('riskProfile', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione seu perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conservative">
                      Conservador - Prefiro segurança, mesmo com rendimentos menores
                    </SelectItem>
                    <SelectItem value="moderate">
                      Moderado - Aceito riscos calculados para melhores rendimentos
                    </SelectItem>
                    <SelectItem value="aggressive">
                      Agressivo - Busco最大化 rendimentos, aceito riscos elevados
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Próximo Passo</h4>
                <p className="text-blue-700 text-sm">
                  Após configurar seu perfil, você precisará importar o extrato bancário do mês anterior 
                  para que a plataforma seja completamente alimentada com seus dados financeiros.
                </p>
              </div>
            </CardContent>
          </Card>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Configurar seu Perfil Financeiro
          </h1>
          <p className="text-gray-600">
            Vamos personalizar sua experiência com base em suas informações
          </p>
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Etapa {currentStep} de {totalSteps}</span>
            <span>{Math.round((currentStep / totalSteps) * 100)}% completo</span>
          </div>
          <Progress value={(currentStep / totalSteps) * 100} />
        </div>

        {renderStep()}

        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            Anterior
          </Button>
          
          <Button
            onClick={nextStep}
            disabled={isSubmitting}
          >
            {currentStep === totalSteps ? 'Finalizar Configuração' : 'Próximo'}
          </Button>
        </div>
      </div>
    </div>
  )
}
