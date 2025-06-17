"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Bug } from "lucide-react"

interface DebugButtonProps {
  formId: string
}

export default function DebugButton({ formId }: DebugButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchDebugInfo = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/forms/${formId}/debug`)
      const data = await response.json()
      setDebugInfo(data)
    } catch (error) {
      console.error("Error fetching debug info:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpen = () => {
    setIsOpen(true)
    fetchDebugInfo()
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen} className="flex items-center">
        <Bug className="mr-2 h-4 w-4" />
        Debug
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Form Debug Information</DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="py-4">Loading debug information...</div>
          ) : (
            <div className="py-4">
              <pre className="bg-slate-100 p-4 rounded-md overflow-auto max-h-96 text-sm">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
