"use client"
import jsPDF from "jspdf"
import { Button } from "@/components/ui/button"

export default function PDFExporter({ formData }: { formData: any }) {
  const handleExport = () => {
    const doc = new jsPDF()
    doc.text(`Form #${formData.formNumber}`, 10, 20)
    doc.save(`form-${formData.formNumber}.pdf`)
  }

  return <Button onClick={handleExport}>Export PDF</Button>
}