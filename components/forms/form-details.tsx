"use client"

import { Input } from "@/components/ui/input"
import type React from "react"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Upload,
  Trash2,
  Printer,
  FileDown,
  Calendar,
  Clock,
  FileText,
  Clock3,
  Users,
} from "lucide-react"
import SignatureCanvas from "react-signature-canvas"
import FormStatusBadge from "@/components/ui/form-status-badge"
import { jsPDF } from "jspdf"
import html2canvas from "html2canvas"
import DebugButton from "../../debug-button"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { sendMail } from "../../lib/mail"

interface FormDetailsProps {
  form: any
  userRole: string
  userId: string
}

export default function FormDetails({ form, userRole, userId }: FormDetailsProps) {
  const router = useRouter()
  const { toast } = useToast()
  const signatureRef = useRef<SignatureCanvas>(null)

  // References for PDF export
  const pdfRef = useRef<HTMLDivElement>(null)

  // State to track if form data has been loaded
  const [isLoaded, setIsLoaded] = useState(false)
  const [formData, setFormData] = useState<any>(form || {})
  const [formNotFound, setFormNotFound] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // State for approval/rejection dialogs and related data
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false)
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false)
  const [comments, setComments] = useState("")
  const [rejectionReason, setRejectionReason] = useState("")
  const [signatureMethod, setSignatureMethod] = useState("draw")
  const [uploadedSignature, setUploadedSignature] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Add new state for Operation Manager signature
  const [pmSignatureMethod, setPmSignatureMethod] = useState("draw")
  const [pmUploadedSignature, setPmUploadedSignature] = useState<string | null>(null)
  const pmSignatureRef = useRef<SignatureCanvas>(null)

  // Function to calculate the difference between two times in hours
  const calculateHours = (startTime: string, endTime: string): number => {
    const [startHours, startMinutes] = startTime.split(":").map(Number)
    const [endHours, endMinutes] = endTime.split(":").map(Number)

    const startDate = new Date(0, 0, 0, startHours, startMinutes)
    const endDate = new Date(0, 0, 0, endHours, endMinutes)

    let diff = endDate.getTime() - startDate.getTime()
    let hours = Math.floor(diff / (1000 * 60 * 60))
    diff -= hours * (1000 * 60 * 60)
    const minutes = Math.floor(diff / (1000 * 60))

    // If the end time is earlier than the start time, assume it's on the next day
    if (hours < 0) {
      hours = hours + 24
    }

    return hours + minutes / 60
  }

  // Function to send email notifications
  const sendEmailNotifications = async (formData: any) => {
    try {
      const formType = formData.type === "leave" ? "Leave Request" : "Overtime Request"
      const formNumber = formData.formNumber ? formatFormId(formData.formNumber) : "0001"

      // Prepare email content
      const subject = `New ${formType} Form #${formNumber} Submitted`
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0f766e;">New ${formType} Form Submitted</h2>
          <p>Form #${formNumber} has been submitted and requires your attention.</p>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 5px; padding: 15px; margin: 15px 0;">
            <h3 style="margin-top: 0;">Form Details:</h3>
            <p><strong>Form Type:</strong> ${formType}</p>
            <p><strong>Form ID:</strong> ${formNumber}</p>
            <p><strong>Submitted On:</strong> ${new Date(formData.createdAt).toLocaleDateString()}</p>
            ${
              formData.type === "leave"
                ? `<p><strong>Leave Type:</strong> ${formData.data.leaveType}</p>
               <p><strong>Date Range:</strong> ${new Date(formData.data.startDate).toLocaleDateString()} - ${new Date(formData.data.endDate).toLocaleDateString()}</p>
               <p><strong>Total Days:</strong> ${formData.data.totalDays}</p>`
                : `<p><strong>Date:</strong> ${new Date(formData.data.date).toLocaleDateString()}</p>
               <p><strong>Time Range:</strong> ${formData.data.startTime} - ${formData.data.endTime}</p>`
            }
            <p><strong>Reason:</strong> ${formData.data.reason}</p>
          </div>
          
          <p>Please log in to the system to review and process this request.</p>
          <p>This is an automated notification. Please do not reply to this email.</p>
        </div>
      `

      // Send email to HRD
      await sendMail({
        to: process.env.HRD_EMAIL || "admn.htmf@gmail.com",
        subject,
        html: htmlContent,
      })

      // Send email to PMC if it's an overtime request
      if (formData.type === "overtime") {
        await sendMail({
          to: process.env.PMC_EMAIL || "yenci1505.htm@gmail.com",
          subject,
          html: htmlContent,
        })
      }

      console.log("Email notifications sent successfully")
    } catch (error) {
      console.error("Error sending email notifications:", error)
    }
  }

  // Fetch the latest form data when component mounts
  useEffect(() => {
    const fetchFormData = async () => {
      try {
        if (!form || !form.id) {
          setFormNotFound(true)
          setIsLoaded(true)
          return
        }

        const response = await fetch(`/api/forms/${form.id}`)
        if (response.ok) {
          const data = await response.json()
          setFormData(data)
          setFormNotFound(false)

          // Send email notifications when form data is loaded
          // Only send if the form status is "pending" to avoid sending multiple emails
          if (data.status === "pending" || data.status === "pending_pmc" || data.status === "pending_hrd") {
            sendEmailNotifications(data)
          }
        } else {
          setFormNotFound(true)
        }
      } catch (error) {
        console.error("Error fetching form data:", error)
        setFormNotFound(true)
      } finally {
        setIsLoaded(true)
      }
    }

    fetchFormData()
  }, [form]) // Use optional chaining to safely access form.id

  // Add this near the beginning of the component, after the hooks
  if (formNotFound) {
    return (
      <div className="min-h-screen bg-teal-50/50 dark:bg-slate-900 flex items-center justify-center">
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-6 max-w-md mx-auto text-center">
          <div className="mb-4">
            <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-full inline-flex">
              <FileText className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <h2 className="text-xl font-semibold mb-2">Form Not Found</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            The requested form could not be found or has been deleted.
          </p>
          <Button onClick={() => router.push("/dashboard")} className="bg-teal-600 hover:bg-teal-700">
            Return to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  // Custom PDF export function using html2canvas and jsPDF directly
  const handleExportPdf = async () => {
    if (!pdfRef.current) return

    setIsExporting(true)

    try {
      // Show print-only elements
      const printOnlyElements = pdfRef.current.querySelectorAll(".print-only")
      printOnlyElements.forEach((el) => el.classList.add("pdf-show"))

      // Create a clone of the content to avoid modifying the original DOM
      const contentClone = pdfRef.current.cloneNode(true) as HTMLElement

      // Create a temporary container for the clone
      const tempContainer = document.createElement("div")
      tempContainer.style.position = "absolute"
      tempContainer.style.left = "-9999px"
      tempContainer.style.width = "210mm" // A4 width
      tempContainer.style.backgroundColor = "white"
      document.body.appendChild(tempContainer)
      tempContainer.appendChild(contentClone)

      // Apply compact styles to the clone to fit everything on one page
      const styleElement = document.createElement("style")
      styleElement.textContent = `
      /* Reset all margins and paddings to be smaller */
      * {
        margin: 0 !important;
        padding: 0 !important;
        box-sizing: border-box !important;
        visibility: visible !important;
      }
      
      /* Overall container */
      #printContent {
        padding: 5mm !important;
        font-size: 9pt !important;
      }
      
      /* Company header */
      .company-header {
        display: flex !important;
        align-items: center !important;
        border-bottom: 1px solid #0f766e !important;
        padding-bottom: 3mm !important;
        margin-bottom: 3mm !important;
      }
      
      .company-header img {
        width: 40px !important;
        height: 40px !important;
      }
      
      .company-header h1 {
        font-size: 12pt !important;
        margin: 0 !important;
      }
      
      .company-header p {
        font-size: 7pt !important;
        margin: 0 !important;
      }
      
      /* Form title */
      .form-title {
        text-align: center !important;
        margin: 3mm 0 !important;
      }
      
      .form-title h1 {
        font-size: 14pt !important;
        margin: 0 !important;
        color: #0f766e !important;
      }
      
      .form-title p {
        font-size: 8pt !important;
        margin: 0 !important;
      }
      
      /* Status overview */
      .mb-6 {
        margin-bottom: 3mm !important;
      }
      
      /* Cards */
      .print-card {
        border: 1px solid #e2e8f0 !important;
        border-radius: 4px !important;
        margin-bottom: 3mm !important;
      }
      
      .print-card-header {
        background-color: #f8fafc !important;
        padding: 2mm 3mm !important;
        border-bottom: 1px solid #e2e8f0 !important;
      }
      
      .print-card-content {
        padding: 3mm !important;
      }
      
      /* Text sizes */
      .text-xs {
        font-size: 7pt !important;
      }
      
      .text-sm {
        font-size: 8pt !important;
      }
      
      .text-base {
        font-size: 9pt !important;
      }
      
      /* Grid layouts */
      .grid-cols-2 {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 2mm !important;
      }
      
      /* Approvals section */
      .grid-cols-1.md\\:grid-cols-2 {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 2mm !important;
      }
      
      /* Approval cards */
      .border.rounded-md.p-3 {
        padding: 2mm !important;
        margin-bottom: 2mm !important;
      }
      
      /* Signature containers */
      .signature-container {
        max-height: 30px !important;
        overflow: hidden !important;
      }
      
      .signature-container img {
        max-height: 25px !important;
        object-fit: contain !important;
      }
      
      /* Company footer */
      .company-footer {
        display: flex !important;
        justify-content: space-between !important;
        border-top: 1px solid #0f766e !important;
        padding-top: 2mm !important;
        margin-top: 3mm !important;
        font-size: 7pt !important;
      }
      
      /* Hide non-print elements */
      .no-print {
        display: none !important;
      }
      
      /* Show print-only elements */
      .pdf-show {
        display: block !important;
      }
      
      /* Reduce spacing between elements */
      .space-y-4 > * + * {
        margin-top: 2mm !important;
      }
      
      .gap-4 {
        gap: 2mm !important;
      }
      
      .gap-2 {
        gap: 1mm !important;
      }
      
      /* Make badges more compact */
      .status-badge {
        padding: 1mm 2mm !important;
        font-size: 7pt !important;
      }
      
      /* Optimize employee information */
      .mb-4.last\\:mb-0 {
        margin-bottom: 2mm !important;
      }
      
      .mb-2 {
        margin-bottom: 1mm !important;
      }
      
      /* Optimize reason text area */
      .p-3.bg-slate-50 {
        padding: 2mm !important;
      }
    `
      contentClone.appendChild(styleElement)

      // Create a PDF with A4 dimensions
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      })

      // A4 dimensions in mm
      const pageWidth = 210
      const pageHeight = 297
      const margin = 5 // Reduced margin to fit more content
      const contentWidth = pageWidth - margin * 2

      // Capture the content with html2canvas
      const canvas = await html2canvas(contentClone, {
        scale: 2, // Higher scale for better quality
        useCORS: true,
        logging: false,
        allowTaint: true,
        backgroundColor: "#ffffff",
        windowWidth: 794, // A4 width in pixels at 96 DPI
      })

      // Get the image data
      const imgData = canvas.toDataURL("image/png")

      // Calculate the aspect ratio
      const imgWidth = contentWidth
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      // Add the image to the PDF, scaled to fit on one page
      if (imgHeight > pageHeight - margin * 2) {
        // If content is too tall, scale it down to fit on one page
        const scale = (pageHeight - margin * 2) / imgHeight
        const scaledWidth = imgWidth * scale

        // Center the scaled image horizontally
        const xOffset = (pageWidth - scaledWidth) / 2

        pdf.addImage(imgData, "PNG", xOffset, margin, scaledWidth, imgHeight * scale)
      } else {
        // If content fits, add it normally
        pdf.addImage(imgData, "PNG", margin, margin, imgWidth, imgHeight)
      }

      // Save the PDF
      pdf.save(
        `${formData.type === "leave" ? "Leave-Request" : "Overtime-Request"}-${formData.formNumber || formData.id}.pdf`,
      )

      // Clean up
      document.body.removeChild(tempContainer)

      // Remove the pdf-show class from the original elements
      printOnlyElements.forEach((el) => el.classList.remove("pdf-show"))

      toast({
        title: "Success",
        description: "PDF generated successfully on a single page",
      })
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  // Handle print function
  const handlePrint = () => {
    window.print()
  }

  // Handle file upload for signature
  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setUploadedSignature(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Handle file upload for Operation Manager signature
  const handlePmSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setPmUploadedSignature(event.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Clear signature
  const clearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clear()
    }
  }

  // Clear Operation Manager signature
  const clearPmSignature = () => {
    if (pmSignatureRef.current) {
      pmSignatureRef.current.clear()
    }
  }

  // Get signature data
  const getSignature = () => {
    if (signatureMethod === "draw" && signatureRef.current) {
      if (signatureRef.current.isEmpty()) {
        toast({
          title: "Signature Required",
          description: "Please provide your signature",
          variant: "destructive",
        })
        return null
      }
      return signatureRef.current.toDataURL()
    } else if (signatureMethod === "upload") {
      if (!uploadedSignature) {
        toast({
          title: "Signature Required",
          description: "Please upload your signature",
          variant: "destructive",
        })
        return null
      }
      return uploadedSignature
    }
    return null
  }

  // Get Operation Manager signature data
  const getPmSignature = () => {
    if (pmSignatureMethod === "draw" && pmSignatureRef.current) {
      if (pmSignatureRef.current.isEmpty()) {
        // Return empty string instead of showing error and blocking
        return ""
      }
      return pmSignatureRef.current.toDataURL()
    } else if (pmSignatureMethod === "upload") {
      if (!pmUploadedSignature) {
        // Return empty string instead of showing error and blocking
        return ""
      }
      return pmUploadedSignature
    }
    return ""
  }

  // Handle approve form
  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Get HRD signature
      const signature = getSignature()
      if (!signature) {
        setIsSubmitting(false)
        return
      }

      // Prepare request body
      const requestBody: any = {
        signature,
        comments,
      }

      // Get Operation Manager signature if HRD is approving, but make it optional
      if (userRole === "hrd" && formData.type === "overtime") {
        const pmSignature = getPmSignature()
        // No validation check here - pmSignature can be empty
        requestBody.pmSignature = pmSignature
      }

      console.log("Submitting approval with:", {
        hasSignature: !!signature,
        hasPmSignature: !!requestBody.pmSignature,
        userRole,
      })

      // Submit approval
      const response = await fetch(`/api/forms/${formData.id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: data.message || "Form approved successfully",
        })
        setIsApproveDialogOpen(false)

        // Fetch updated form data to show the new signatures
        const updatedFormResponse = await fetch(`/api/forms/${formData.id}`)
        if (updatedFormResponse.ok) {
          const updatedForm = await updatedFormResponse.json()
          setFormData(updatedForm)
        }

        router.refresh()

        if (data.allApproved) {
          router.push("/dashboard")
        }
      } else {
        throw new Error(data.error || "Failed to approve form")
      }
    } catch (error) {
      console.error("Error approving form:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to approve form",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle reject form
  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (!rejectionReason) {
        toast({
          title: "Reason Required",
          description: "Please provide a reason for rejection",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      // Submit rejection
      const response = await fetch(`/api/forms/${formData.id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: rejectionReason,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: "Form rejected successfully",
        })
        setIsRejectDialogOpen(false)
        router.refresh()
        router.push("/dashboard")
      } else {
        throw new Error(data.error || "Failed to reject form")
      }
    } catch (error) {
      console.error("Error rejecting form:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reject form",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle process form (for intermediate status)
  const handleProcess = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Get signature if available, but don't require it
      const signature =
        signatureMethod === "draw" && signatureRef.current
          ? signatureRef.current.isEmpty()
            ? null
            : signatureRef.current.toDataURL()
          : uploadedSignature

      // Submit process status
      const response = await fetch(`/api/forms/${formData.id}/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          signature,
          comments,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: "Form marked as 'In Process'. You can still approve or reject it later.",
        })
        setIsProcessDialogOpen(false)

        // Fetch updated form data
        const updatedFormResponse = await fetch(`/api/forms/${formData.id}`)
        if (updatedFormResponse.ok) {
          const updatedForm = await updatedFormResponse.json()
          setFormData(updatedForm)
        }

        router.refresh()
      } else {
        throw new Error(data.error || "Failed to process form")
      }
    } catch (error) {
      console.error("Error processing form:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process form",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Check if user can approve/reject based on role and form status
  const canApprove = () => {
    // For overtime forms, implement sequential approval
    if (formData.type === "overtime") {
      // PMC can approve if status is pending_pmc or pending
      if (userRole === "pmc") {
        return formData.status === "pending_pmc" || formData.status === "pending" || formData.status === "process"
      }

      // HRD can only approve if PMC has already approved (status is pending_hrd)
      if (userRole === "hrd") {
        return formData.status === "pending_hrd" || formData.status === "process"
      }

      // Admin can approve anytime
      if (userRole === "admin") {
        return true
      }

      return false
    } else {
      // For leave requests, PMC approval is not required
      if (userRole === "pmc") {
        return false // PMC cannot approve leave requests
      }

      return (
        (userRole === "hrd" || userRole === "admin") && (formData.status === "pending" || formData.status === "process")
      )
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  // Format form ID to display as 4-digit number (0001, 0002, etc.)
  const formatFormId = (id: string | number) => {
    // Jika formData memiliki formNumber, gunakan itu
    if (formData.formNumber) {
      const numericId = Number(formData.formNumber)
      if (!isNaN(numericId)) {
        return numericId.toString().padStart(4, "0")
      }
    }

    // Jika id adalah string yang sudah dalam format 4 digit, gunakan langsung
    if (typeof id === "string" && /^\d{1,4}$/.test(id)) {
      return id.padStart(4, "0")
    }

    try {
      // Jika id adalah angka atau string angka, format dengan leading zeros
      if (typeof id === "number" || (typeof id === "string" && /^\d+$/.test(id))) {
        const numericId = typeof id === "number" ? id : Number.parseInt(id, 10)
        if (!isNaN(numericId)) {
          return numericId.toString().padStart(4, "0")
        }
      }

      // Jika sampai di sini, berarti id bukan angka (mungkin CUID)
      // Coba gunakan formNumber dari formData jika ada
      if (formData.formNumber) {
        return Number(formData.formNumber).toString().padStart(4, "0")
      }

      // Fallback ke default
      return "0001"
    } catch (error) {
      console.log("Error formatting form ID:", error)
      // Fallback ke formNumber jika ada, atau default
      return formData.formNumber ? Number(formData.formNumber).toString().padStart(4, "0") : "0001"
    }
  }

  // Custom status badge renderer
  const renderStatusBadge = () => {
    if (formData.type === "overtime" && formData.status === "pending_hrd") {
      return (
        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/30">
          Waiting for HRD approval
        </Badge>
      )
    }

    return <FormStatusBadge status={formData.status} className="status-badge" />
  }

  // Company information
  const companyName = "PT. Hang Tong Manufactory"
  const companyLogo = "/images/Logo.jpg" // Replace with actual logo path
  const companyAddress = "Horizon Industrial Park blok F No 2, Kelurahan. Sei Lekop, Kecamatan. Sagulung, Kota Batam."
  const companyEmail = "admn.htmf@gmail.com"

  // Custom print styles (will be hidden except when printing)
  const printStyles = `
  @media print {
    body * {
      visibility: hidden;
    }
    #printContent, #printContent * {
      visibility: visible;
    }
    #printContent {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      padding: 15px;
      background-color: white;
    }
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    .no-print {
      display: none !important;
    }
    
    /* Company header and footer */
    .company-header {
      display: flex !important;
      align-items: center;
      border-bottom: 2px solid #0f766e;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    
    .company-footer {
      display: flex !important;
      justify-content: space-between;
      border-top: 1px solid #0f766e;
      padding-top: 10px;
      margin-top: 20px;
      font-size: 9pt !important;
      color: #64748b;
    }
    
    /* Form title */
    .form-title {
      font-size: 18pt !important;
      font-weight: bold;
      text-align: center;
      margin: 15px 0;
      color: #0f766e;
    }
    
    /* Card styling */
    .print-card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      margin-bottom: 15px;
      page-break-inside: avoid;
    }
    
    .print-card-header {
      background-color: #f8fafc;
      padding: 10px 15px;
      border-bottom: 1px solid #e2e8f0;
      border-radius: 8px 8px 0 0;
    }
    
    .print-card-content {
      padding: 15px;
    }
    
    /* Text sizes */
    .text-xs {
      font-size: 9pt !important;
    }
    .text-sm {
      font-size: 10pt !important;
    }
    .text-base {
      font-size: 11pt !important;
    }
    .text-lg {
      font-size: 12pt !important;
    }
    
    /* Ensure signatures don't get too large */
    .signature-container {
      max-height: 60px;
      overflow: hidden;
    }
    
    /* Status badges */
    .status-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 9pt !important;
      font-weight: bold;
    }
    
    .status-pending {
      background-color: #fef3c7;
      color: #92400e;
    }
    
    .status-approved {
      background-color: #d1fae5;
      color: #065f46;
    }
    
    .status-rejected {
      background-color: #fee2e2;
      color: #b91c1c;
    }
    
    .status-process {
      background-color: #e0f2fe;
      color: #0369a1;
    }
    
    /* Grid layouts */
    .grid-cols-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    
    /* Show print-only elements */
    .print-only {
      display: block !important;
    }
    
    /* Physical signature area */
    .physical-signature {
      border-bottom: 1px dashed #000;
      height: 40px;
      margin: 15px 0;
      width: 100%;
      display: block;
      clear: both;
    }

    /* Operations Manager signature section */
    .operations-manager-section {
      margin-top: 20px;
      margin-bottom: 20px;
      page-break-inside: avoid;
      clear: both;
    }

    .signature-line {
      display: flex;
      justify-content: space-between;
      margin-top: 10px;
      width: 100%;
    }

    .signature-field {
      width: 45%;
      border-top: 1px dashed #000;
      padding-top: 5px;
      margin-top: 10px;
    }

    /* Ensure everything fits on one page */
    #printContent {
      max-height: none;
      overflow: visible;
    }

    /* Optimize for single page */
    #printContent {
      zoom: 0.80; /* Reduce zoom slightly to fit more content */
      max-height: none;
    }
    
    .print-card {
      margin-bottom: 10px;
    }
    
    .print-card-content {
      padding: 10px;
    }
    
    .company-header {
      margin-bottom: 10px;
    }
    
    .form-title {
      margin: 10px 0;
    }
    
    .physical-signature {
      height: 30px;
      margin: 5px 0;
    }
    
    .signature-container {
      max-height: 40px;
    }
    
    /* Reduce spacing */
    .mb-6 {
      margin-bottom: 10px !important;
    }
    
    .space-y-4 > * + * {
      margin-top: 8px !important;
    }
    
    .p-6 {
      padding: 10px !important;
    }
    
    .p-3 {
      padding: 8px !important;
    }
    
    .gap-4 {
      gap: 8px !important;
    }
  }

  @media screen {
    .print-only {
      display: none;
    }
  }
  `

  const pdfStyles = `
  @media screen {
    .pdf-show {
      display: none;
    }
  }
  
  @page {
    size: A4 portrait;
    margin: 10mm;
  }
  
  /* Optimize for full-page PDF */
  @media print {
    #printContent {
      width: 210mm;
      min-height: 297mm;
      padding: 10mm;
      margin: 0 auto;
      transform-origin: top left;
      transform: scale(1);
      page-break-after: always;
    }
    
    .print-card {
      margin-bottom: 5mm;
    }
    
    /* Ensure content fits on page */
    body, html {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
    }
  }
`

  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-teal-50/50 dark:bg-slate-900">
      <style>{printStyles + pdfStyles}</style>

      <div className="container mx-auto py-6 px-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-between items-center mb-6 no-print"
        >
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 text-teal-600 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-900/20"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>

          <div className="flex gap-2">
            <DebugButton formId={formData.id} />
            <Button
              variant="outline"
              onClick={handlePrint}
              className="flex items-center gap-2 border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/20"
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>

            <Button
              variant="outline"
              onClick={handleExportPdf}
              disabled={isExporting}
              className="flex items-center gap-2 border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/20"
            >
              <FileDown className="h-4 w-4" />
              {isExporting ? "Exporting..." : "Export PDF"}
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          ref={pdfRef}
          id="printContent"
          className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm p-6 max-w-4xl mx-auto"
          style={{ width: "100%" }}
        >
          {/* Company Header - Only visible when printing */}
          <div className="company-header print-only">
            <div className="flex items-center gap-4">
              <Image src={companyLogo || "/placeholder.svg"} alt="Company Logo" width={60} height={60} />
              <div>
                <h1 className="text-xl font-bold">{companyName}</h1>
                <p className="text-sm text-slate-500">{companyAddress}</p>
              </div>
            </div>
          </div>

          {/* Form Title */}
          <div className="form-title mb-6 text-center">
            <h1 className="text-2xl font-bold text-teal-600 dark:text-teal-400">
              {formData.type === "leave" ? "Leave Request Form" : "Overtime Request Form"}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Form ID: {formData.formNumber ? formatFormId(formData.formNumber) : "0001"} | Submitted on{" "}
              {formatDate(formData.createdAt)}
            </p>
          </div>

          {/* Add notification for overtime pending HRD approval */}
          {formData.type === "overtime" && formData.status === "pending_hrd" && (
            <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-md">
              <div className="flex items-center">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full mr-3">
                  <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-medium text-blue-700 dark:text-blue-300">PMC Approval Complete</h3>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    This overtime request has been approved by PMC and is now waiting for final approval from HRD.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Status Overview */}
          <div className="mb-6 flex justify-between items-center">
            <div className="flex items-center gap-2">
              {formData.type === "leave" ? (
                <div className="flex items-center gap-2">
                  <div className="bg-teal-100 dark:bg-teal-900/30 p-2 rounded-full">
                    <Calendar className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div>
                    <h3 className="font-medium">Leave Request</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {formatDate(formData.data.startDate)} - {formatDate(formData.data.endDate)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="bg-cyan-100 dark:bg-cyan-900/30 p-2 rounded-full">
                    <Clock3 className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="font-medium">Overtime Request</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{formatDate(formData.data.date)}</p>
                    {formData.type === "overtime" && formData.status === "pending_hrd" && (
                      <p className="text-xs text-blue-500 dark:text-blue-400 font-medium mt-1 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        Waiting for HRD approval
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
            {renderStatusBadge()}
          </div>

          {/* Employee Information */}
          <Card className="mb-6 print-card">
            <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b pb-3 print-card-header">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-teal-500" />
                  Employee Information
                </CardTitle>
              </div>
            </CardHeader>

            <CardContent className="pt-4 print-card-content">
              {formData.data.employees &&
                formData.data.employees.map((employee: any, index: number) => (
                  <div key={index} className="mb-4 last:mb-0">
                    <h4 className="font-medium text-sm mb-2 text-teal-700 dark:text-teal-300">Employee #{index + 1}</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Name</p>
                        <p className="font-medium">{employee.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Position</p>
                        <p>{employee.position || "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">ID</p>
                        <p>{employee.employeeId || "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Department</p>
                        <p>{employee.department || "-"}</p>
                      </div>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>

          {/* Request Details */}
          <Card className="mb-6 print-card">
            <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b pb-3 print-card-header">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-teal-500" />
                Request Details
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-4 print-card-content">
              {formData.type === "leave" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Leave Type</p>
                      <p className="font-medium">{formData.data.leaveType}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Total Days</p>
                      <Badge className="bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 hover:bg-teal-200 dark:hover:bg-teal-800/30">
                        {formData.data.isHalfDay
                          ? `${formData.data.totalDays} (Half Day - ${formData.data.halfDayPeriod === "morning" ? "Morning" : "Afternoon"})`
                          : formData.data.totalDays}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Start Date</p>
                      <p>{formatDate(formData.data.startDate)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">End Date</p>
                      <p>{formatDate(formData.data.endDate)}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Reason</p>
                    <p className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-slate-700 mt-1">
                      {formData.data.reason}
                    </p>
                  </div>
                </div>
              )}

              {formData.type === "overtime" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Date</p>
                      <p className="font-medium">{formatDate(formData.data.date)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Time Range</p>
                      <div className="flex items-center gap-2">
                        <p>
                          {formData.data.startTime || "--:--"} to {formData.data.endTime || "--:--"}
                        </p>
                        {formData.data.startTime && formData.data.endTime && (
                          <Badge className="bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300 hover:bg-cyan-200 dark:hover:bg-cyan-800/30">
                            {calculateHours(formData.data.startTime, formData.data.endTime)} hours
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Reason</p>
                    <p className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-slate-700 mt-1">
                      {formData.data.reason}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Approvals */}
          <Card className="mb-6 print-card">
            <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b pb-3 print-card-header">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-teal-500" />
                Approvals
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-4 print-card-content">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Filter out PMC approvals for leave requests and sort approvals */}
                {[...formData.approvals]
                  .filter((approval) => !(formData.type === "leave" && approval.role === "pmc"))
                  .sort((a, b) => {
                    // Put leader first, then PMC, then HRD
                    if (a.role === "leader") return -1
                    if (b.role === "leader") return 1
                    if (a.role === "pmc") return -1
                    if (b.role === "pmc") return 1
                    return 0
                  })
                  .map((approval: any) => (
                    <div key={approval.id} className="border rounded-md p-3 bg-slate-50 dark:bg-slate-900/50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium capitalize">{approval.role}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {approval.approver ? approval.approver.name : "Pending"}
                            {approval.status === "approved" && approval.updatedAt && (
                              <> | Approved on {formatDate(approval.updatedAt)}</>
                            )}
                          </p>
                        </div>
                        <FormStatusBadge
                          status={approval.status}
                          customText={
                            approval.role === "hrd" && approval.status === "approved" ? "Acknowledged" : undefined
                          }
                        />
                      </div>

                      {approval.signature && (
                        <div className="mt-2">
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Signature</p>
                          <div className="border rounded-md p-1 bg-white signature-container">
                            <Image
                              src={approval.signature || "/placeholder.svg"}
                              alt="Signature"
                              width={150}
                              height={50}
                              className="object-contain max-h-12"
                            />
                          </div>
                        </div>
                      )}

                      {approval.comments && (
                        <div className="mt-2">
                          <p className="text-xs text-slate-500 dark:text-slate-400">Comments</p>
                          <p className="text-xs">{approval.comments}</p>
                        </div>
                      )}
                    </div>
                  ))}

                {/* Operation Manager signature */}
                {formData.pmSignature && (
                  <div className="border rounded-md p-3 bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium capitalize">Operation Manager</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {formData.pmApprovalDate ? `Approved on ${formatDate(formData.pmApprovalDate)}` : "Approved"}
                        </p>
                      </div>
                      <FormStatusBadge status="approved" />
                    </div>

                    <div className="mt-2">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Signature</p>
                      <div className="border rounded-md p-1 bg-white signature-container">
                        <Image
                          src={formData.pmSignature || "/placeholder.svg"}
                          alt="Operation Manager Signature"
                          width={150}
                          height={50}
                          className="object-contain max-h-12"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Operations Manager Signature for Leave Forms - Only for print */}
          {formData.type === "leave" && (
            <div className="print-only mb-6 operations-manager-section">
              <div className="print-card">
                <div className="print-card-header">
                  <h3 className="font-medium">Operations Manager</h3>
                </div>
                <div className="print-card-content">
                  <p className="text-sm mb-2">Please sign physically below:</p>
                  <div className="physical-signature"></div>
                  <div className="signature-line">
                    <div className="signature-field">
                      <span className="text-xs">Name</span>
                    </div>
                    <div className="signature-field">
                      <span className="text-xs">Date</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Company Footer - Only visible when printing */}
          <div className="company-footer print-only">
            <div>
              <p>
                {companyName} &copy; {new Date().getFullYear()}
              </p>
            </div>
            <div>
              <p>{companyEmail}</p>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        {canApprove() && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="max-w-4xl mx-auto mt-6 no-print"
          >
            <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <CardFooter className="border-t pt-4 flex justify-end gap-2">
                <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" className="flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      Reject
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <form onSubmit={handleReject}>
                      <DialogHeader>
                        <DialogTitle>Reject Request</DialogTitle>
                        <DialogDescription>Please provide a reason for rejecting this request.</DialogDescription>
                      </DialogHeader>
                      <div className="py-4">
                        <Textarea
                          placeholder="Reason for rejection"
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          rows={4}
                          required
                        />
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" variant="destructive" disabled={isSubmitting}>
                          {isSubmitting ? "Rejecting..." : "Reject Request"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                <Dialog open={isProcessDialogOpen} onOpenChange={setIsProcessDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Process
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <form onSubmit={handleProcess}>
                      <DialogHeader>
                        <DialogTitle>Process Request</DialogTitle>
                        <DialogDescription>
                          Mark this request as "In Process". This is a temporary status and you can still approve or
                          reject it later.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsProcessDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting} className="bg-teal-600 hover:bg-teal-700">
                          {isSubmitting ? "Processing..." : "Mark as In Process"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700">
                      <CheckCircle className="h-4 w-4" />
                      Approve
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <form onSubmit={handleApprove}>
                      <DialogHeader>
                        <DialogTitle>Approve Request</DialogTitle>
                        <DialogDescription>
                          {userRole === "pmc"
                            ? "As PMC, please sign to approve this request."
                            : userRole === "hrd" && formData.type === "overtime"
                              ? "As HRD, please provide final approval for this overtime request."
                              : "Please sign to approve this request."}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4 space-y-6">
                        <Textarea
                          placeholder="Comments (optional)"
                          value={comments}
                          onChange={(e) => setComments(e.target.value)}
                          rows={2}
                        />

                        {/* HRD Signature Section */}
                        <div className="space-y-4">
                          <h3 className="text-sm font-medium">
                            {userRole === "pmc" ? "PMC Signature" : "HRD Signature"}
                          </h3>
                          <Tabs defaultValue="draw" onValueChange={setSignatureMethod}>
                            <TabsList className="mb-4">
                              <TabsTrigger value="draw">Draw Signature</TabsTrigger>
                              <TabsTrigger value="upload">Upload Signature</TabsTrigger>
                            </TabsList>

                            <TabsContent value="draw" className="space-y-4">
                              <div className="border rounded-md p-2 bg-white">
                                <SignatureCanvas
                                  ref={signatureRef}
                                  canvasProps={{
                                    width: 500,
                                    height: 200,
                                    className: "w-full h-48 border rounded-md",
                                  }}
                                />
                              </div>
                              <Button type="button" variant="outline" onClick={clearSignature}>
                                Clear Signature
                              </Button>
                            </TabsContent>

                            <TabsContent value="upload" className="space-y-4">
                              <div className="flex flex-col items-center justify-center border rounded-md p-6 bg-white">
                                {uploadedSignature ? (
                                  <div className="flex flex-col items-center">
                                    <Image
                                      src={uploadedSignature || "/placeholder.svg"}
                                      alt="Uploaded Signature"
                                      width={300}
                                      height={150}
                                      className="mb-4 border"
                                    />
                                    <Button type="button" variant="outline" onClick={() => setUploadedSignature(null)}>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Remove Signature
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center">
                                    <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                                    <p className="text-sm text-muted-foreground mb-4">
                                      Upload your signature image (PNG or JPG)
                                    </p>
                                    <Input
                                      id="signature-upload"
                                      type="file"
                                      accept="image/*"
                                      onChange={handleSignatureUpload}
                                      className="max-w-xs"
                                    />
                                  </div>
                                )}
                              </div>
                            </TabsContent>
                          </Tabs>
                        </div>

                        {/* Operation Manager Signature Section */}
                        <div
                          className="space-y-4"
                          style={{ display: userRole === "hrd" && formData.type === "overtime" ? "block" : "none" }}
                        >
                          <h3 className="text-sm font-medium">Operation Manager Signature (Optional)</h3>
                          <Tabs defaultValue="draw" onValueChange={setPmSignatureMethod}>
                            <TabsList className="mb-4">
                              <TabsTrigger value="draw">Draw Signature</TabsTrigger>
                              <TabsTrigger value="upload">Upload Signature</TabsTrigger>
                            </TabsList>

                            <TabsContent value="draw" className="space-y-4">
                              <div className="border rounded-md p-2 bg-white">
                                <SignatureCanvas
                                  ref={pmSignatureRef}
                                  canvasProps={{
                                    width: 500,
                                    height: 200,
                                    className: "w-full h-48 border rounded-md",
                                  }}
                                />
                              </div>
                              <Button type="button" variant="outline" onClick={clearPmSignature}>
                                Clear Signature
                              </Button>
                            </TabsContent>

                            <TabsContent value="upload" className="space-y-4">
                              <div className="flex flex-col items-center justify-center border rounded-md p-6 bg-white">
                                {pmUploadedSignature ? (
                                  <div className="flex flex-col items-center">
                                    <Image
                                      src={pmUploadedSignature || "/placeholder.svg"}
                                      alt="Operation Manager Signature"
                                      width={300}
                                      height={150}
                                      className="mb-4 border"
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => setPmUploadedSignature(null)}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Remove Signature
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center">
                                    <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                                    <p className="text-sm text-muted-foreground mb-4">
                                      Upload Operation Manager signature image (PNG or JPG) (Optional)
                                    </p>
                                    <Input
                                      id="pm-signature-upload"
                                      type="file"
                                      accept="image/*"
                                      onChange={handlePmSignatureUpload}
                                      className="max-w-xs"
                                    />
                                  </div>
                                )}
                              </div>
                            </TabsContent>
                          </Tabs>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsApproveDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting} className="bg-teal-600 hover:bg-teal-700">
                          {isSubmitting ? "Approving..." : "Approve Request"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  )
}
