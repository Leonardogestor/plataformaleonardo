"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

interface DashboardContextType {
  month: number
  year: number
  activeTab: string
  setMonth: (month: number) => void
  setYear: (year: number) => void
  setActiveTab: (tab: string) => void
  nextMonth: () => void
  prevMonth: () => void
  goToToday: () => void
  formatDate: () => string
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [month, setMonthState] = useState(new Date().getMonth() + 1)
  const [year, setYearState] = useState(new Date().getFullYear())
  const [activeTab, setActiveTabState] = useState("presente")

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("dashboard-date")
      if (saved) {
        try {
          const { month: savedMonth, year: savedYear, tab: savedTab } = JSON.parse(saved)
          setMonthState(savedMonth)
          setYearState(savedYear)
          setActiveTabState(savedTab || "presente")
        } catch (e) {
          // Use current date as fallback
        }
      }
    }
  }, [])

  // Save to localStorage on change
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("dashboard-date", JSON.stringify({ month, year, tab: activeTab }))
    }
  }, [month, year, activeTab])

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

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab)
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

  return (
    <DashboardContext.Provider
      value={{
        month,
        year,
        activeTab,
        setMonth,
        setYear,
        setActiveTab,
        nextMonth,
        prevMonth,
        goToToday,
        formatDate,
      }}
    >
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const context = useContext(DashboardContext)
  if (context === undefined) {
    throw new Error("useDashboard must be used within a DashboardProvider")
  }
  return context
}
