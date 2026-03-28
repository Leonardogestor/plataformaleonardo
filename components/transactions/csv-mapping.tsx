"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MapPin } from "lucide-react"

interface ParsedRow {
  [key: string]: string
}

interface CsvMappingProps {
  headers: string[]
  data: ParsedRow[]
  onMapping?: (mapping: Record<string, string>) => void
  onBack: () => void
}

const REQUIRED_FIELDS = [
  { key: "type", label: "Tipo" },
  { key: "category", label: "Categoria" },
  { key: "amount", label: "Valor" },
  { key: "description", label: "Descrição" },
  { key: "date", label: "Data" },
]

const OPTIONAL_FIELDS = [{ key: "accountId", label: "Conta (opcional)" }]

export function CsvMapping({ headers, data, onMapping, onBack }: CsvMappingProps) {
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [autoMapped, setAutoMapped] = useState(false)

  useEffect(() => {
    if (!autoMapped) {
      const autoMapping: Record<string, string> = {}

      const normalizeHeader = (header: string) =>
        header
          .toLowerCase()
          .trim()
          .replace(/[^a-z]/g, "")

      headers.forEach((header) => {
        const normalized = normalizeHeader(header)

        if (normalized.includes("tipo") || normalized === "type") {
          autoMapping.type = header
        } else if (normalized.includes("categoria") || normalized === "category") {
          autoMapping.category = header
        } else if (
          normalized.includes("valor") ||
          normalized.includes("amount") ||
          normalized === "value"
        ) {
          autoMapping.amount = header
        } else if (
          normalized.includes("descricao") ||
          normalized.includes("description") ||
          normalized === "desc"
        ) {
          autoMapping.description = header
        } else if (normalized.includes("data") || normalized === "date") {
          autoMapping.date = header
        } else if (normalized.includes("conta") || normalized === "account") {
          autoMapping.accountId = header
        }
      })

      setMapping(autoMapping)
      setAutoMapped(true)
    }
  }, [headers, autoMapped])

  const handleMappingChange = (field: string, value: string) => {
    setMapping((prev) => ({ ...prev, [field]: value }))
  }

  const isValid = REQUIRED_FIELDS.every((field) => mapping[field.key])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Mapeamento de Colunas
        </CardTitle>
        <CardDescription>Associe as colunas do CSV aos campos do sistema</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg bg-muted p-4">
          <p className="text-sm text-muted-foreground">
            Mapeamento automático detectado. Revise e ajuste se necessário.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold">Campos Obrigatórios</h3>
          {REQUIRED_FIELDS.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.key}>{field.label}</Label>
              <Select
                value={String(mapping[field.key] || "")}
                onValueChange={(value) => handleMappingChange(field.key, value)}
              >
                <SelectTrigger id={field.key}>
                  <SelectValue placeholder="Selecione uma coluna" />
                </SelectTrigger>
                <SelectContent>
                  {headers
                    .filter((header) => header && header.trim() !== "")
                    .map((header) => (
                      <SelectItem key={String(header)} value={String(header)}>
                        {String(header)} (ex: {data[0]?.[header]})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold">Campos Opcionais</h3>
          {OPTIONAL_FIELDS.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.key}>{field.label}</Label>
              <Select
                value={
                  mapping[field.key] === undefined || mapping[field.key] === "none"
                    ? "none"
                    : String(mapping[field.key])
                }
                onValueChange={(value) =>
                  handleMappingChange(field.key, value === "none" ? "" : value)
                }
              >
                <SelectTrigger id={field.key}>
                  <SelectValue placeholder="Selecione uma coluna" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {headers
                    .filter((header) => header && header.trim() !== "")
                    .map((header) => (
                      <SelectItem key={String(header)} value={String(header)}>
                        {String(header)} (ex: {data[0]?.[header]})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>
            Voltar
          </Button>
          <Button
            onClick={() => onMapping && onMapping(mapping)}
            disabled={!isValid}
            className="flex-1"
          >
            Confirmar Mapeamento
          </Button>
        </div>

        {!isValid && (
          <p className="text-sm text-destructive">
            Preencha todos os campos obrigatórios para continuar
          </p>
        )}
      </CardContent>
    </Card>
  )
}
