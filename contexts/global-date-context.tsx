"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

interface GlobalDateContextType {
  month: number
  year: number
  day: number
  setMonth: (month: number) => void
  setYear: (year: number) => void
  setDay: (day: number) => void
  setPeriod: (month: number, year: number) => void
  nextMonth: () => void
  prevMonth: () => void
  goToToday: () => void
  formatDate: () => string
  formatDateShort: () => string
  showDaysSelector: boolean
}

const GlobalDateContext = createContext<GlobalDateContextType | undefined>(undefined)

export function GlobalDateProvider({ children }: { children: ReactNode }) {
  const [month, setMonthState] = useState(new Date().getMonth() + 1)
  const [year, setYearState] = useState(new Date().getFullYear())
  const [day, setDayState] = useState(new Date().getDate())
  const [showDaysSelector, setShowDaysSelector] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("global-date")
      if (saved) {
        try {
          const { month: savedMonth, year: savedYear, day: savedDay } = JSON.parse(saved)
          setMonthState(savedMonth)
          setYearState(savedYear)
          if (savedDay) {
            setDayState(savedDay)
          }
        } catch (e) {
          // Use current date as fallback
        }
      }
    }
  }, [])

  // Save to localStorage on change
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("global-date", JSON.stringify({ month, year, day }))
    }
  }, [month, year, day])

  const setMonth = (newMonth: number) => {
    if (newMonth < 1) {
      setMonthState(12)
      setYearState(year - 1)
    } else if (newMonth > 12) {
      setMonthState(1)
      setYearState(year + 1)
    } else {
      setMonthState(newMonth)
    }
  }

  const setDay = (newDay: number) => {
    const daysInMonth = new Date(year, month, 0).getDate()
    if (newDay < 1) {
      setDayState(daysInMonth)
    } else if (newDay > daysInMonth) {
      setDayState(1)
    } else {
      setDayState(newDay)
    }
  }

  const setYear = (newYear: number) => {
    setYearState(newYear)
  }

  const setPeriod = (newMonth: number, newYear: number) => {
    setMonthState(newMonth)
    setYearState(newYear)
  }

  const nextMonth = () => {
    setMonth(month + 1)
  }

  const prevMonth = () => {
    setMonth(month - 1)
  }

  const goToToday = () => {
    const today = new Date()
    setMonthState(today.getMonth() + 1)
    setYearState(today.getFullYear())
    setDayState(today.getDate())
    setShowDaysSelector(true)
  }

  const formatDate = () => {
    const monthNames = [
      "Janeiro",
      "Fevereiro",
      "Março",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro",
    ]
    return `${monthNames[month - 1]} ${year}`
  }

  const formatDateShort = () => {
    if (showDaysSelector) {
      return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`
    }
    return `${String(month).padStart(2, "0")}/${year}`
  }

  return (
    <GlobalDateContext.Provider
      value={{
        month,
        year,
        day,
        setMonth,
        setYear,
        setDay,
        setPeriod,
        nextMonth,
        prevMonth,
        goToToday,
        formatDate,
        formatDateShort,
        showDaysSelector,
      }}
    >
      {children}
    </GlobalDateContext.Provider>
  )
}

export function useGlobalDate() {
  const context = useContext(GlobalDateContext)
  if (context === undefined) {
    throw new Error("useGlobalDate must be used within a GlobalDateProvider")
  }
  return context
}
