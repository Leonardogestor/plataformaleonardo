"use client"

import { Input } from "@/components/ui/input"
import { useState, useEffect, forwardRef, ForwardRefRenderFunction } from "react"

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: number
  onChange: (value: number) => void
  placeholder?: string
}

// Brazilian currency formatting functions
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

const parseCurrency = (formattedValue: string): number => {
  if (!formattedValue || formattedValue.trim() === "") return 0

  try {
    // Remove tudo exceto números, vírgula e ponto
    const cleaned = formattedValue.replace(/[^\d,.-]/g, "")

    // Substitui vírgula por ponto para parsing
    const normalized = cleaned.replace(/\./g, "").replace(",", ".")

    // Verifica se não tem múltiplos pontos
    const parts = normalized.split(".")
    if (parts.length > 2) {
      // Mantém apenas primeiro ponto (decimal)
      const validNumber = parts[0] + "." + (parts[1] || "0")
      return parseFloat(validNumber)
    }

    const parsed = parseFloat(normalized)
    return isNaN(parsed) ? 0 : parsed
  } catch (error) {
    console.error("Error parsing currency:", error)
    return 0
  }
}

const handleInputChange = (inputValue: string, currentValue: number): string => {
  // Allow empty input
  if (!inputValue) return ""

  // Remove all non-numeric characters except comma and dot
  let cleaned = inputValue.replace(/[^\d,.-]/g, "")

  // Handle multiple dots and commas
  const parts = cleaned.split(/[,.]/)
  if (parts.length > 2) {
    // Keep only first two parts (integer and decimal)
    cleaned = parts[0] + "," + parts.slice(1).join("")
  }

  // Ensure only one comma
  const commaCount = (cleaned.match(/,/g) || []).length
  if (commaCount > 1) {
    cleaned = cleaned.replace(/,(?=.*?,)/g, "")
  }

  // Handle decimal part (max 2 digits)
  const commaIndex = cleaned.lastIndexOf(",")
  if (commaIndex !== -1 && cleaned.length - commaIndex - 1 > 2) {
    cleaned = cleaned.substring(0, commaIndex + 3)
  }

  // Format as user types (showing currency format)
  if (cleaned) {
    const numericValue = parseCurrency(cleaned)
    return formatCurrency(numericValue)
  }

  return cleaned
}

const CurrencyInput: ForwardRefRenderFunction<HTMLInputElement, CurrencyInputProps> = (
  { value, onChange, placeholder = "0,00", className, ...props },
  ref
) => {
  const [displayValue, setDisplayValue] = useState<string>(() => formatCurrency(value))

  useEffect(() => {
    setDisplayValue(formatCurrency(value))
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value

    // Special handling for when user is typing numbers directly
    if (/^\d+$/.test(inputValue.replace(/[^\d]/g, ""))) {
      // User is typing raw numbers (like 1222000)
      const numericValue = parseFloat(inputValue.replace(/[^\d]/g, "")) / 100
      onChange(numericValue)
      setDisplayValue(formatCurrency(numericValue))
    } else {
      // User is typing with formatting
      const formatted = handleInputChange(inputValue, value)
      setDisplayValue(formatted)

      // Only update the actual value when it's a valid formatted number
      if (formatted) {
        const parsed = parseCurrency(formatted)
        onChange(parsed)
      }
    }
  }

  const handleBlur = () => {
    // Ensure proper formatting on blur
    const formatted = formatCurrency(value)
    setDisplayValue(formatted)
  }

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Select all text on focus for easy editing
    e.target.select()
  }

  return (
    <Input
      ref={ref}
      type="text"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      placeholder={placeholder}
      className={className}
      {...props}
    />
  )
}

export const CurrencyInputRef = forwardRef(CurrencyInput)
export { CurrencyInputRef as CurrencyInput }
