"use client"

import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDashboard } from '@/contexts/dashboard-context'

export function DateControls() {
  const { month, year, setMonth, setYear, nextMonth, prevMonth, goToToday, formatDate } = useDashboard()

  const months = [
    { value: 1, label: 'Jan' },
    { value: 2, label: 'Fev' },
    { value: 3, label: 'Mar' },
    { value: 4, label: 'Abr' },
    { value: 5, label: 'Mai' },
    { value: 6, label: 'Jun' },
    { value: 7, label: 'Jul' },
    { value: 8, label: 'Ago' },
    { value: 9, label: 'Set' },
    { value: 10, label: 'Out' },
    { value: 11, label: 'Nov' },
    { value: 12, label: 'Dez' },
  ]

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  return (
    <div className="flex items-center gap-2 bg-muted/80 rounded-lg p-1">
      {/* Navigation */}
      <Button
        variant="ghost"
        size="sm"
        onClick={prevMonth}
        className="h-8 w-8 p-0"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={nextMonth}
        className="h-8 w-8 p-0"
      >
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
      <Button
        variant="ghost"
        size="sm"
        onClick={goToToday}
        className="h-8 px-2"
      >
        <Calendar className="h-4 w-4 mr-1" />
        Hoje
      </Button>
    </div>
  )
}
