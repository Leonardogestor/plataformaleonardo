"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { FileText, FileSpreadsheet } from "lucide-react"
import { DocumentUpload } from "./document-upload"

interface DocumentUploadDialogProps {
  onUpload?: (document: any) => void
}

export function DocumentUploadDialog({ onUpload }: DocumentUploadDialogProps) {
  const [open, setOpen] = useState(false)

  const handleUpload = (document: any) => {
    onUpload?.(document)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="h-4 w-4 mr-2" />
          Enviar PDF ou Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enviar Extrato Bancário</DialogTitle>
          <DialogDescription>
            Envie seus extratos bancários em PDF ou Excel para importar transações automaticamente.
          </DialogDescription>
        </DialogHeader>
        <DocumentUpload onUpload={handleUpload} />
      </DialogContent>
    </Dialog>
  )
}
