"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

interface GlobalDateContextType {
  month: number
  year: number
  setMonth: (month: number) => void
  setYear: (year: number) => void
  setPeriod: (month: number, year: number) => void
  nextMonth: () => void
  prevMonth: () => void
  goToToday: () => void
  formatDate: () => string
  formatDateShort: () => string
}

const GlobalDateContext = createContext<GlobalDateContextType | undefined>(undefined)

export function GlobalDateProvider({ children }: { children: ReactNode }) {
  const [month, setMonthState] = useState(new Date().getMonth() + 1)
  const [year, setYearState] = useState(new Date().getFullYear())

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("global-date")
    if (saved) {
      try {
        const { month: savedMonth, year: savedYear } = JSON.parse(saved)
        setMonthState(savedMonth)
        setYearState(savedYear)
      } catch (e) {
        // Use current date as fallback
      }
    }
  }, [])

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem("global-date", JSON.stringify({ month, year }))
  }, [month, year])

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
  }

  const formatDate = () => {
    const monthNames = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
    ]
    return `${monthNames[month - 1]} ${year}`
  }

  const formatDateShort = () => {
    return `${String(month).padStart(2, "0")}/${year}`
  }

  return (
    <GlobalDateContext.Provider
      value={{
        month,
        year,
        setMonth,
        setYear,
        setPeriod,
        nextMonth,
        prevMonth,
        goToToday,
        formatDate,
        formatDateShort,
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
