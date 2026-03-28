"use client"

import { useGlobalDate } from "@/contexts/global-date-context"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"

export function PeriodHeader() {
  const {
    month,
    year,
    day,
    setMonth,
    setYear,
    setDay,
    nextMonth,
    prevMonth,
    goToToday,
    formatDateShort,
    showDaysSelector,
  } = useGlobalDate()

  const months = [
    { value: 1, label: "Jan" },
    { value: 2, label: "Fev" },
    { value: 3, label: "Mar" },
    { value: 4, label: "Abr" },
    { value: 5, label: "Mai" },
    { value: 6, label: "Jun" },
    { value: 7, label: "Jul" },
    { value: 8, label: "Ago" },
    { value: 9, label: "Set" },
    { value: 10, label: "Out" },
    { value: 11, label: "Nov" },
    { value: 12, label: "Dez" },
  ]

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 7 }, (_, i) => currentYear - 2 + i)

  // Get days in current month
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month, 0).getDate()
  }

  const days = Array.from({ length: getDaysInMonth(month, year) }, (_, i) => i + 1)

  return (
    <div className="flex flex-col items-center mb-6">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold tracking-tight">
          Dados referentes a: {formatDateShort()}
        </h1>
        <p className="text-muted-foreground">Visão completa das finanças do período selecionado</p>
      </div>

      <div className="flex items-center gap-2 bg-muted/80 rounded-lg p-1">
        {/* Navigation */}
        <Button variant="ghost" size="sm" onClick={prevMonth} className="h-8 w-8 p-0">
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="sm" onClick={nextMonth} className="h-8 w-8 p-0">
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Month Selector */}
        <Select value={month.toString()} onValueChange={(value) => setMonth(parseInt(value))}>
          <SelectTrigger className="w-16 h-8 border-0 bg-transparent">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m.value} value={m.value.toString()}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Year Selector */}
        <Select value={year.toString()} onValueChange={(value) => setYear(parseInt(value))}>
          <SelectTrigger className="w-20 h-8 border-0 bg-transparent">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={y.toString()}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Today Button */}
        <Button variant="ghost" size="sm" onClick={goToToday} className="h-8 px-2">
          <Calendar className="h-4 w-4 mr-1" />
          Hoje
        </Button>

        {/* Days Selector - Only show when today is clicked */}
        {showDaysSelector && (
          <Select value={day.toString()} onValueChange={(value) => setDay(parseInt(value))}>
            <SelectTrigger className="w-16 h-8 border-0 bg-transparent">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {days.map((d) => (
                <SelectItem key={d} value={d.toString()}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  )
}
