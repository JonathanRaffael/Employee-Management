"use client"

import { Input } from "@/components/ui/input"
import type React from "react"
import { useState, useRef, useCallback, useMemo, memo, useEffect } from "react"
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
  DialogClose,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import {
  ArrowLeft,
  CheckCircle,
  Upload,
  Trash2,
  Printer,
  FileDown,
  Calendar,
  Clock,
  FileText,
  Clock3,
  Users,
  Briefcase,
  Paperclip,
} from "lucide-react"
import SignatureCanvas from "react-signature-canvas"
import FormStatusBadge from "@/components/ui/form-status-badge"
import { jsPDF } from "jspdf"
import html2canvas from "html2canvas"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"

// Define proper types
interface Employee {
  id: string
  name: string
  employeeCode: string
  department: string
  position: string
}

interface Approval {
  id: string
  role: string
  status: string
  comments?: string
  createdAt: string
  updatedAt?: string
  signature?: string | null
  approvedAt?: string | null
  approver?: {
    id: string
    name: string | null
    role: string | null
  }
}

interface UploadedDocumentFile {
  documentType: string
  fileName: string
  fileData: string
}

interface FormData {
  id: string
  formNumber?: number
  type: string
  status: string
  createdAt: string
  updatedAt: string
  data: any

  employee: Employee
  approvals: Approval[]

  pmSignature?: string
  pmApprovalDate?: string
  applicantSignature?: string | null

  leader?: {
    id: string
    name: string | null
    role: string | null
  }
  employeeSignature?: string | null
  leaderSignature?: string | null
}

interface FormDetailsProps {
  form: FormData
  userRole: string
  userId: string
}

const FormDetails = memo(function FormDetails({ form, userRole, userId }: FormDetailsProps) {
  const router = useRouter()
  const signatureRef = useRef<SignatureCanvas>(null)
  const pmSignatureRef = useRef<SignatureCanvas>(null)
  const supervisorSignatureRef = useRef<SignatureCanvas>(null) // New ref for supervisor signature
  const pdfRef = useRef<HTMLDivElement>(null)

  const [formData, setFormData] = useState<FormData>(form)

  /* MENAMBAHKAN useEffect untuk SYNC SERVER DATA → CLIENT STATE */
  /* 🔥 WAJIB: SYNC SERVER DATA KE STATE - FIX FINAL */
  useEffect(() => {
    setFormData(form)
  }, [form])

  const [loadingStates, setLoadingStates] = useState({
    isLoaded: true,
    isExporting: false,
    emailSending: false,
    isSubmitting: false,
  })
  const [dialogStates, setDialogStates] = useState({
    isApproveDialogOpen: false,
    isRejectDialogOpen: false,
    isProcessDialogOpen: false,
  })
  const [formStates, setFormStates] = useState({
    comments: "",
    rejectionReason: "",
    signatureMethod: "draw" as string,
    uploadedSignature: null as string | null,
    pmSignatureMethod: "draw" as string,
    pmUploadedSignature: null as string | null,
    supervisorSignatureMethod: "draw" as string,
    supervisorUploadedSignature: null as string | null,
  })
  const [lastEmailSent, setLastEmailSent] = useState<number>(0)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const companyInfo = useMemo(
    () => ({
      name: "PT. Hang Tong Manufactory",
      logo: "/images/logo-cropped.png",
      address: "Horizon Industrial Park blok F No 2, Kelurahan. Sei Lekop, Kecamatan. Sagulung, Kota Batam.",
      email: "admn.htmf@gmail.com",
    }),
    [],
  )

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }, [])

  const formatManualDates = useCallback(
    (dates: string[]) => {
      if (!dates || dates.length === 0) return ""
      const sortedDates = [...dates].sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      return sortedDates.map((date) => formatDate(date)).join(", ")
    },
    [formatDate],
  )

  const isManualDatesLeave = useCallback((data: any) => {
    return data?.dateSelectionMode === "manual" && data?.manualDates && data.manualDates.length > 0
  }, [])

  const formatFormId = useCallback(
    () => {
      if (formData.formNumber) {
        const numericId = Number(formData.formNumber)
        if (!isNaN(numericId)) {
          return numericId.toString().padStart(4, "0")
        }
      }
      return "0001"
    },
    [formData.formNumber],
  )

  const calculateHours = useCallback((startTime: string, endTime: string): number => {
    const [startHours, startMinutes] = startTime.split(":").map(Number)
    const [endHours, endMinutes] = endTime.split(":").map(Number)

    const startDate = new Date(0, 0, 0, startHours, startMinutes)
    const endDate = new Date(0, 0, 0, endHours, endMinutes)

    let diff = endDate.getTime() - startDate.getTime()
    let hours = Math.floor(diff / (1000 * 60 * 60))
    diff -= hours * (1000 * 60 * 60)
    const minutes = Math.floor(diff / (1000 * 60))

    if (hours < 0) {
      hours = hours + 24
    }

    return hours + minutes / 60
  }, [])

  const sendEmail = useCallback(
    async (emailData: { to: string; subject: string; html: string }) => {
      const now = Date.now()

      if (now - lastEmailSent < 30000) {
        toast({
          title: "Please wait",
          description: "Please wait at least 30 seconds before sending another email",
          variant: "destructive",
        })
        return
      }

      if (loadingStates.emailSending) {
        toast({
          title: "Email in progress",
          description: "Please wait for the current email to be sent",
          variant: "destructive",
        })
        return
      }

      try {
        setLoadingStates((prev) => ({ ...prev, emailSending: true }))
        setLastEmailSent(now)

        const response = await fetch("/api/send-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(emailData),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
          throw new Error(errorData.error || "Failed to send email")
        }

        toast({
          title: "Email sent",
          description: "Email notification has been sent successfully",
        })
      } catch (error) {
        console.error("Error sending email:", error)
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to send email",
          variant: "destructive",
        })
        setLastEmailSent(0)
      } finally {
        setLoadingStates((prev) => ({ ...prev, emailSending: false }))
      }
    },
    [loadingStates.emailSending, lastEmailSent],
  )

  const normalize = useCallback((value?: string | null) => value?.toUpperCase() ?? "", [])

  const userRoleNormalized = useMemo(() => normalize(userRole), [userRole, normalize])

  const approvals = formData.approvals ?? []

const alreadyApprovedByMe = useMemo(() => {
  return approvals.some(
    (a) =>
      normalize(a.role) === userRoleNormalized &&
      normalize(a.status) === "APPROVED",
  )
}, [approvals, userRoleNormalized, normalize])


  /* =========================
   NORMALIZED FORM STATUS
   (SINGLE SOURCE OF TRUTH)
========================= */
  const formStatusNormalized = useMemo(() => normalize(formData.status), [formData.status])

  /* =========================
   CAN APPROVE LOGIC
========================= */
  const canApprove = useMemo(() => {
  const role = normalize(userRole)

  // ❌ hanya HRD
  if (role !== "HRD") return false

  // ❌ sudah final
  if (["APPROVED", "REJECTED"].includes(formStatusNormalized)) return false

  // ❌ HRD sudah approve sebelumnya
  if (alreadyApprovedByMe) return false

  // ✅ boleh approve saat PENDING / PROCESS
  return true
}, [formStatusNormalized, userRole, alreadyApprovedByMe, normalize])

  /* =========================
   STATUS BADGE (UI)
========================= */
  const renderStatusBadge = useMemo(() => {
    const statusMap: Record<string, { label: string; className: string }> = {
      PENDING: {
        label: "Waiting Approval",
        className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
      },
      APPROVED: {
        label: "Approved",
        className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
      },
      REJECTED: {
        label: "Rejected",
        className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
      },
    }

    const statusConfig = statusMap[formStatusNormalized] ?? {
      label: formStatusNormalized,
      className: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300",
    }

    return <Badge className={`${statusConfig.className} no-print`}>{statusConfig.label}</Badge>
  }, [formStatusNormalized])

  /* =========================
    PROCESSED APPROVALS
  ========================= */
  const processedApprovals = useMemo(() => {
  const approvals = [...formData.approvals].sort((a, b) => {
    const roleA = normalize(a.role)
    const roleB = normalize(b.role)

    if (roleA === "LEADER") return -1
    if (roleB === "LEADER") return 1
    if (roleA === "SUPERVISOR") return -1
    if (roleB === "SUPERVISOR") return 1
    if (roleA === "HRD") return -1
    if (roleB === "HRD") return 1
    return 0
  })

  console.log(
    "[v1] Processed approvals:",
    approvals.map((a) => ({
      role: a.role,
      status: a.status,
    }))
  )

  return approvals
}, [formData.approvals])

  /* =========================
    LEADER APPROVAL (AUTO)
  ========================= */
  const leaderApproval = useMemo(() => {
    return formData.approvals.find((a) => normalize(a.role) === "LEADER")
  }, [formData.approvals])

  const leaderSignatureSrc = useMemo(() => {
    if (!leaderApproval?.signature) return undefined

    return leaderApproval.signature.startsWith("data:")
      ? leaderApproval.signature
      : `data:image/png;base64,${leaderApproval.signature}`
  }, [leaderApproval])

  /* =========================
    SUPPORTING DOCUMENTS
  ========================= */
  const supportingDocuments = useMemo(() => {
    const docs: UploadedDocumentFile[] = formData.data?.uploadedDocumentFiles || []
    const docTypes: string[] = formData.data?.supportingDocuments || []

    return {
      files: docs,
      types: docTypes,
      hasDocuments: docs.length > 0 || docTypes.length > 0,
    }
  }, [formData.data])

  /* =========================
    SIGNATURE UPLOAD HANDLERS
  ========================= */
  const handleSignatureUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      setFormStates((prev) => ({
        ...prev,
        uploadedSignature: event.target?.result as string,
      }))
    }
    reader.readAsDataURL(file)
  }, [])

  const handlePmSignatureUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      setFormStates((prev) => ({
        ...prev,
        pmUploadedSignature: event.target?.result as string,
      }))
    }
    reader.readAsDataURL(file)
  }, [])

  // New handler for supervisor signature upload
  const handleSupervisorSignatureUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setFormStates((prev) => ({ ...prev, supervisorUploadedSignature: event.target?.result as string }))
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const clearSignature = useCallback(() => {
    signatureRef.current?.clear()
  }, [])

  const clearPmSignature = useCallback(() => {
    pmSignatureRef.current?.clear()
  }, [])

  // New function to clear supervisor signature
  const clearSupervisorSignature = useCallback(() => {
    supervisorSignatureRef.current?.clear()
  }, [])

  const getSignature = useCallback(() => {
    if (formStates.signatureMethod === "draw" && signatureRef.current) {
      if (signatureRef.current.isEmpty()) {
        toast({
          title: "Signature Required",
          description: "Please provide your signature",
          variant: "destructive",
        })
        return null
      }
      return signatureRef.current.toDataURL()
    } else if (formStates.signatureMethod === "upload") {
      if (!formStates.uploadedSignature) {
        toast({
          title: "Signature Required",
          description: "Please upload your signature",
          variant: "destructive",
        })
        return null
      }
      return formStates.uploadedSignature
    }
    return null
  }, [formStates.signatureMethod, formStates.uploadedSignature])

  const getPmSignature = useCallback(() => {
    if (formStates.pmSignatureMethod === "draw" && pmSignatureRef.current) {
      if (pmSignatureRef.current.isEmpty()) {
        return ""
      }
      return pmSignatureRef.current.toDataURL()
    } else if (formStates.pmSignatureMethod === "upload") {
      if (!formStates.pmUploadedSignature) {
        return ""
      }
      return formStates.pmUploadedSignature
    }
    return ""
  }, [formStates.pmSignatureMethod, formStates.pmUploadedSignature])

  // New function to get supervisor signature
  const getSupervisorSignature = useCallback(() => {
    if (formStates.supervisorSignatureMethod === "draw" && supervisorSignatureRef.current) {
      if (supervisorSignatureRef.current.isEmpty()) {
        return "" // Optional, so return empty if not provided
      }
      return supervisorSignatureRef.current.toDataURL()
    } else if (formStates.supervisorSignatureMethod === "upload") {
      return formStates.supervisorUploadedSignature || ""
    }
    return ""
  }, [formStates.supervisorSignatureMethod, formStates.supervisorUploadedSignature])

  const handleApprove = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      setLoadingStates((prev) => ({ ...prev, isSubmitting: true }))

      try {
        const signature = getSignature()
        if (!signature) {
          setLoadingStates((prev) => ({ ...prev, isSubmitting: false }))
          return
        }

        const roleNormalized = normalize(userRole)
        const formTypeNormalized = normalize(formData.type)

        const requestBody: any = {
          signature,
          comments: formStates.comments,
        }

        // For HRD approval endpoints that expect hrdSignature field
        if (roleNormalized === "HRD") {
          requestBody.hrdSignature = signature
        }

        if (roleNormalized === "HRD" && formTypeNormalized === "OVERTIME") {
          const pmSignature = getPmSignature()
          requestBody.pmSignature = pmSignature

          const supervisorSig = getSupervisorSignature()
          if (supervisorSig) {
            requestBody.supervisorSignature = supervisorSig
          }
        }

        console.log("[v0] Sending approval request:", {
          formId: formData.id,
          userRole,
          roleNormalized,
          formType: formData.type,
          formTypeNormalized,
          hasSignature: !!signature,
          signatureLength: signature?.length,
          requestBodyKeys: Object.keys(requestBody),
        })

        const response = await fetch(`/api/forms/${formData.id}/approve`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(requestBody),
})

if (!response.ok) {
  throw new Error("Approve failed")
}

// 🔥 INI YANG SELAMA INI HILANG
router.back()
router.refresh()
  
        const data = await response.json()

        console.log("[v0] Approval response:", {
          ok: response.ok,
          status: response.status,
          data,
        })

        if (response.ok) {
          toast({
            title: "Success",
            description: data.message || "Form approved successfully",
          })
          setDialogStates((prev) => ({ ...prev, isApproveDialogOpen: false }))

          await new Promise((resolve) => setTimeout(resolve, 100))

         // ✅ FINAL: HRD approval = final
if (response.ok && data.form) {
  setFormData((prev) => ({
    ...prev,
    status: "APPROVED",
    approvals: data.form.approvals,
  }))
}
          router.refresh()

          if (data.allApproved) {
            router.push("/dashboard")
          }
        } else {
          if (response.status === 409 || response.status === 400) {
            // Business error - show toast and return, don't throw
            toast({
              variant: "destructive",
              title: "Cannot approve",
              description: data.error || "This action is not allowed",
            })
            setDialogStates((prev) => ({ ...prev, isApproveDialogOpen: false }))
            return
          }

          // Unexpected technical error
          throw new Error(data.error || "Failed to approve form")
        }
      } catch (error) {
        console.error("Unexpected approve error:", error)
        toast({
          title: "System error",
          description: "Something went wrong. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoadingStates((prev) => ({ ...prev, isSubmitting: false }))
      }
    },
    [
      alreadyApprovedByMe,
      getSignature,
      formStates.comments,
      userRole,
      formData.type,
      formData.id,
      getPmSignature,
      getSupervisorSignature,
      router,
      toast,
      normalize,
      formData.approvals, // Include formData.approvals if needed for some logic here
    ],
  )

  const handleReject = useCallback(
  async (e: React.FormEvent) => {
    e.preventDefault()

    // ❌ Guard: user sudah approve
    if (alreadyApprovedByMe) {
      toast({
        title: "Already approved",
        description: "You have already approved this form.",
        variant: "destructive",
      })
      return
    }

    // ❌ Guard: alasan reject wajib
    const rejectionReason = formStates.rejectionReason.trim()
    if (!rejectionReason) {
      toast({
        title: "Rejection Reason Required",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      })
      return
    }

    setLoadingStates((prev) => ({ ...prev, isSubmitting: true }))

    try {
      const response = await fetch(`/api/forms/${formData.id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rejectionReason, // ✅ FIELD SESUAI BACKEND
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Business logic error (validation / status)
        throw new Error(data.error || "Failed to reject form")
      }

      toast({
        title: "Success",
        description: "Form rejected successfully",
      })

      // ✅ Tutup dialog
      setDialogStates((prev) => ({ ...prev, isRejectDialogOpen: false }))

      // ✅ Refresh data & balik dashboard
      router.refresh()
      router.push("/dashboard")
    } catch (error) {
      console.error("Error rejecting form:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reject form",
        variant: "destructive",
      })
    } finally {
      setLoadingStates((prev) => ({ ...prev, isSubmitting: false }))
    }
  },
  [alreadyApprovedByMe, formStates.rejectionReason, formData.id, router],
)

  const handleProcess = useCallback(
  async (e: React.FormEvent) => {
    e.preventDefault()

    setLoadingStates((prev) => ({ ...prev, isSubmitting: true }))

    try {
      const response = await fetch(`/api/forms/${formData.id}/process`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          comments: formStates.comments || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to process form")
      }

      toast({
        title: "Success",
        description: "Form marked as In Process.",
      })

      setDialogStates((prev) => ({ ...prev, isProcessDialogOpen: false }))
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to process form",
        variant: "destructive",
      })
    } finally {
      setLoadingStates((prev) => ({ ...prev, isSubmitting: false }))
    }
  },
  [formData.id, formStates.comments, router],
)

  const handleExportPdf = useCallback(async () => {
    if (!pdfRef.current) return

    setLoadingStates((prev) => ({ ...prev, isExporting: true }))

    try {
      const printOnlyElements = pdfRef.current.querySelectorAll(".print-only")
      printOnlyElements.forEach((el) => (el as HTMLElement).classList.add("pdf-show"))

      const originalElement = pdfRef.current

      const printStyles = document.createElement("style")
      printStyles.textContent = `
          .pdf-export-container {
            background-color: white !important;
            color: #374151 !important;
            font-size: 9pt !important;
            line-height: 1.1 !important;
            width: 900px !important;
            padding: 15px !important;
            overflow: hidden !important;
          }
          
          .pdf-export-container * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            box-sizing: border-box !important;
          }
          
          .pdf-export-container .company-header {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            border-bottom: 1px solid #0f766e !important;
            padding-bottom: 8px !important;
            margin-bottom: 12px !important;
            font-size: 10pt !important;
          }
          
          .pdf-export-container .company-header h1 {
            font-size: 12pt !important;
            font-weight: bold !important;
            color: #0f766e !important;
            margin: 0 !important;
          }
          
          .pdf-export-container .form-title {
            font-size: 11pt !important;
            font-weight: bold !important;
            text-align: center !important;
            margin: 8px 0 12px 0 !important;
            color: #0f766e !important;
            text-transform: uppercase !important;
            letter-spacing: 0.3px !important;
          }
          
          .pdf-export-container .print-card,
          .pdf-export-container .bg-white,
          .pdf-export-container .border {
            border: 1px solid #d1d5db !important;
            border-radius: 4px !important;
            margin-bottom: 8px !important;
            background-color: white !important;
            overflow: hidden !important;
          }
          
          .pdf-export-container .print-card-header,
          .pdf-export-container .bg-gray-50 {
            background-color: #f9fafb !important;
            padding: 8px 12px !important;
            border-bottom: 1px solid #d1d5db !important;
            border-radius: 4px 4px 0 0 !important;
            font-size: 9pt !important;
            font-weight: 600 !important;
            color: #374151 !important;
            margin: 0 !important;
          }
          
          .pdf-export-container h1, 
          .pdf-export-container h2, 
          .pdf-export-container h3, 
          .pdf-export-container h4, 
          .pdf-export-container h5, 
          .pdf-export-container h6 {
            margin-top: 4px !important;
            margin-bottom: 4px !important;
            font-size: 9pt !important;
            font-weight: 600 !important;
            color: #374151 !important;
            line-height: 1.1 !important;
          }
          
          .pdf-export-container p, 
          .pdf-export-container div, 
          .pdf-export-container span {
            margin-top: 0px !important;
            margin-bottom: 4px !important;
            line-height: 1.1 !important;
            font-size: 8pt !important;
            color: #374151 !important;
          }
          
          .pdf-export-container .grid {
            gap: 8px !important;
          }
          
          .pdf-export-container .flex {
            gap: 8px !important;
          }
          
          .pdf-export-container .inline-flex,
          .pdf-export-container .px-2 {
            font-size: 7pt !important;
            padding: 2px 6px !important;
            border-radius: 4px !important;
            background-color: #f3f4f6 !important;
            color: #374151 !important;
            border: 1px solid #d1d5db !important;
          }
          
          .pdf-export-container .text-sm {
            font-size: 8pt !important;
          }
          
          .pdf-export-container .text-xs {
            font-size: 7pt !important;
          }
          
          .pdf-export-container .signature-section {
            margin-top: 8px !important;
            min-height: 60px !important;
          }
          
          .pdf-export-container .signature-line {
            border-top: 1px solid #000 !important;
            margin-top: 20px !important;
            padding-top: 4px !important;
            font-size: 7pt !important;
            text-align: center !important;
          }
          
          .pdf-export-container .signature-field {
            width: 45% !important;
            display: inline-block !important;
            margin: 0 2.5% !important;
          }
          
          .pdf-export-container .company-footer {
            border-top: 1px solid #0f766e !important;
            padding-top: 8px !important;
            margin-top: 12px !important;
            font-size: 7pt !important;
            color: #6b7280 !important;
            text-align: center !important;
          }
          
          .pdf-export-container .card-content,
          .pdf-export-container .p-4,
          .pdf-export-container .p-6 {
            padding: 8px 12px !important;
          }
          
          .pdf-export-container .print-only {
            display: block !important;
          }
          
          .pdf-export-container .bg-teal-500,
          .pdf-export-container .bg-green-500,
          .pdf-export-container .text-teal-600,
          .pdf-export-container .text-green-600 {
            background-color: #f9fafb !important;
            color: #374151 !important;
          }
          
          .pdf-export-container .shadow,
          .pdf-export-container .shadow-lg,
          .pdf-export-container .shadow-md {
            box-shadow: none !important;
          }
          
          /* Hide status badges in PDF export */
          .pdf-export-container .no-print,
          .pdf-export-container .status-badge,
          .pdf-export-container [class*="FormStatusBadge"],
          .pdf-export-container .approval-status-badge {
            display: none !important;
            visibility: hidden !important;
          }
        `

      const contentClone = originalElement.cloneNode(true) as HTMLElement

      const statusBadges = contentClone.querySelectorAll(".no-print, .status-badge, .approval-status-badge")
      statusBadges.forEach((el) => el.remove())

      const tempContainer = document.createElement("div")
      tempContainer.className = "pdf-export-container"
      tempContainer.style.position = "absolute"
      tempContainer.style.left = "-9999px"
      tempContainer.style.width = "900px"
      tempContainer.style.backgroundColor = "white"
      tempContainer.style.overflow = "hidden"

      document.head.appendChild(printStyles)
      document.body.appendChild(tempContainer)
      tempContainer.appendChild(contentClone)

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      })

      const pageWidth = 210
      const pageHeight = 297
      const margin = 3
      const contentWidth = pageWidth - margin * 2

      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
        backgroundColor: "#ffffff",
        windowWidth: 900,
        windowHeight: 1200,
      })

      const imgData = canvas.toDataURL("image/png")
      const imgWidth = contentWidth
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      if (imgHeight > pageHeight - margin * 2) {
        const scale = (pageHeight - margin * 2) / imgHeight
        const scaledWidth = imgWidth * scale
        const xOffset = (pageWidth - scaledWidth) / 2
        pdf.addImage(imgData, "PNG", xOffset, margin, scaledWidth, imgHeight * scale)
      } else {
        pdf.addImage(imgData, "PNG", margin, margin, imgWidth, imgHeight)
      }

      pdf.save(`${formData.type === "leave" ? "Leave-Request" : "Overtime-Request"}-${formatFormId()}.pdf`)

      document.body.removeChild(tempContainer)
      document.head.removeChild(printStyles)
      printOnlyElements.forEach((el) => (el as HTMLElement).classList.remove("pdf-show"))

      toast({
        title: "Success",
        description: "PDF generated successfully with print formatting",
      })
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingStates((prev) => ({ ...prev, isExporting: false }))
    }
  }, [formData, toast, formatFormId])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  const handleBackToDashboard = useCallback(() => {
    router.push("/dashboard")
  }, [router])

  const handleDialogChange = useCallback((dialogName: keyof typeof dialogStates, isOpen: boolean) => {
    setDialogStates((prev) => ({ ...prev, [dialogName]: isOpen }))
  }, [])

  const handleFormStateChange = useCallback((field: keyof typeof formStates, value: any) => {
    setFormStates((prev) => ({ ...prev, [field]: value }))
  }, [])

  const renderApprovalSection = () => (
    <Card className="mb-6 print-card approvals-section">
      <CardHeader className="bg-slate-50 border-b pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-teal-500" />
          Approvals
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {processedApprovals.map((approval) => {
            const status = normalize(approval.status)

            return (
              <div key={approval.id} className="border rounded-md p-3 bg-slate-50">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">{approval.role}</p>

                    {approval.approver?.name && <p className="text-xs text-slate-500">{approval.approver.name}</p>}

                    {approval.approvedAt && (
                      <p className="text-xs text-slate-500">Approved on {formatDate(approval.approvedAt)}</p>
                    )}
                  </div>

                  <Badge
  className={
    approval.status === "APPROVED"
      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
      : approval.status === "REJECTED"
      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
  }
>
  {approval.status === "APPROVED"
    ? "Approved"
    : approval.status === "REJECTED"
    ? "Rejected"
    : "Pending"}
</Badge>
                </div>

                {approval.signature ? (
                  <div className="mt-2">
                    <p className="text-xs text-slate-500 mb-1">Signature</p>
                    <div className="border rounded-md p-1 bg-white">
                      <img
                        src={
                          approval.signature.startsWith("data:")
                            ? approval.signature
                            : `data:image/png;base64,${approval.signature}`
                        }
                        alt={`${approval.role} Signature`}
                        className="object-contain max-h-12 max-w-[150px]"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-slate-400 italic">Awaiting approval</p>
                )}

                {approval.comments && (
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-xs text-slate-500">Comments:</p>
                    <p className="text-sm">{approval.comments}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )

  if (!loadingStates.isLoaded) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-teal-50/50 dark:bg-slate-900">
      <div className="container mx-auto py-6 px-4">
        {/* Navigation and Action Buttons - Hidden in Print */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-between items-center mb-6 no-print print:hidden"
        >
          <Button
            variant="ghost"
            onClick={handleBackToDashboard}
            className="flex items-center gap-2 text-teal-600 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-900/20 no-print print:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>

          <div className="flex gap-2 no-print print:hidden">
            <Button
              variant="outline"
              onClick={handlePrint}
              className="flex items-center gap-2 border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/20 bg-transparent"
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>

            <Button
              variant="outline"
              onClick={handleExportPdf}
              disabled={loadingStates.isExporting}
              className="flex items-center gap-2 border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/20 bg-transparent"
            >
              <FileDown className="h-4 w-4" />
              {loadingStates.isExporting ? "Exporting..." : "Export PDF"}
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
              <Image src={companyInfo.logo || "/placeholder.svg"} alt="Company Logo" width={60} height={60} />
              <div>
                <h1 className="text-xl font-bold">{companyInfo.name}</h1>
                <p className="text-sm text-slate-500">{companyInfo.address}</p>
              </div>
            </div>
          </div>

          {/* Form Title */}
          <div className="form-title mb-6 text-center">
            <h1 className="text-2xl font-bold text-teal-600 dark:text-teal-400">
              {formData.type === "leave"
                ? "Leave Request Form"
                : formData.type === "overtime"
                  ? "Overtime Request Form"
                  : formData.type === "job-requisition"
                    ? "Job Requisition Form"
                    : formData.type === "training-request"
                      ? "Training Request Form"
                      : "Form"}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Form ID: {formatFormId()} | Submitted on {formatDate(formData.createdAt)}
            </p>
          </div>

          {/* Add notification for overtime pending HRD approval */}
          {formData.type === "overtime" && formStatusNormalized === "PENDING" && (
            <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-md no-print">
              <div className="flex items-center">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full mr-3">
                  <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-medium text-blue-700 dark:text-blue-300">Supervisor Approval Complete</h3>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    This overtime request has been approved by supervisor and is now waiting for final approval from
                    HRD.
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
                      {isManualDatesLeave(formData.data)
                        ? `${formData.data.manualDates.length} selected dates`
                        : `${formatDate(formData.data.startDate)} - ${formatDate(formData.data.endDate)}`}
                    </p>
                  </div>
                </div>
              ) : formData.type === "overtime" ? (
                <div className="flex items-center gap-2">
                  <div className="bg-cyan-100 dark:bg-cyan-900/30 p-2 rounded-full">
                    <Clock3 className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="font-medium">Overtime Request</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{formatDate(formData.data.date)}</p>
                    {normalize(formData.type) === "OVERTIME" && normalize(formData.status) === "WAITING_HRD" && (
                      <p className="text-xs text-blue-500 dark:text-blue-400 font-medium mt-1 flex items-center no-print">
                        <Clock className="h-3 w-3 mr-1" />
                        Waiting for HRD approval
                      </p>
                    )}
                  </div>
                </div>
              ) : formData.type === "job-requisition" ? (
                <div className="flex items-center gap-2">
                  <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-full">
                    <Briefcase className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-medium">Job Requisition</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {formData.data?.requestPosition || "Position not specified"} -{" "}
                      {formData.data?.departmentName || "Department not specified"}
                    </p>
                  </div>
                </div>
              ) : formData.type === "training-request" ? (
                <div className="flex items-center gap-2">
                  <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-full">
                    <Users className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <h3 className="font-medium">Training Request</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {formData.data?.trainingTitle || "Training title not specified"}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="no-print">{renderStatusBadge}</div>
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
              {formData.data?.employees && formData.data.employees.length > 0 ? (
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
                        <p>{employee.employeeCode || employee.employeeId || "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Department</p>
                        <p>{employee.department || "-"}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Name</p>
                    <p className="font-medium">{formData.employee?.name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Position</p>
                    <p>{formData.employee?.position || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Department</p>
                    <p>{formData.employee?.department || "-"}</p>
                  </div>
                </div>
              )}
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
                      <p className="font-medium">{formData.data?.leaveType || "Not specified"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Total Days</p>
                      <Badge className="bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 hover:bg-teal-200 dark:hover:bg-teal-800/30">
                        {formData.data.isHalfDay
                          ? `${formData.data.totalDays} (Half Day - ${formData.data.halfDayPeriod === "morning" ? "Morning" : "Afternoon"})`
                          : formData.data.totalDays}
                      </Badge>
                    </div>
                    {isManualDatesLeave(formData.data) ? (
                      <div className="col-span-2">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                          Selected Dates (Non-consecutive)
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {[...formData.data.manualDates]
                            .sort((a: string, b: string) => new Date(a).getTime() - new Date(b).getTime())
                            .map((date: string, index: number) => (
                              <Badge
                                key={index}
                                variant="outline"
                                className="bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-300 dark:border-teal-700"
                              >
                                {formatDate(date)}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Start Date</p>
                          <p>{formatDate(formData.data.startDate)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">End Date</p>
                          <p>{formatDate(formData.data.endDate)}</p>
                        </div>
                      </>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Reason</p>
                    <p className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-slate-700 mt-1">
                      {formData.data.reason}
                    </p>
                  </div>
                  {formData.data.backupPerson && (
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Backup Person / Pengganti</p>
                      <p className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-slate-700 mt-1">
                        {formData.data.backupPerson}
                      </p>
                    </div>
                  )}
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
                  {formData.data.backupPerson && (
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Backup Person / Pengganti</p>
                      <p className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-slate-700 mt-1">
                        {formData.data.backupPerson}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {formData.type === "job-requisition" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Position Requested</p>
                      <p className="font-medium">{formData.data?.requestPosition || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Department</p>
                      <p className="font-medium">{formData.data?.departmentName || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Employment Type</p>
                      <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800/30">
                        {formData.data?.employmentType || "N/A"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Position Duration</p>
                      <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800/30">
                        {formData.data?.positionDuration || "N/A"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Expected Start Date</p>
                      <p>{formData.data?.expectedStartDate ? formatDate(formData.data.expectedStartDate) : "TBD"}</p>
                    </div>
                    {formData.data?.endDate && (
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">End Date</p>
                        <p>{formatDate(formData.data.endDate)}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Budget Status</p>
                      <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800/30">
                        {formData.data?.budgetStatus || "N/A"}
                      </Badge>
                    </div>
                    {formData.data?.salaryRange && (
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Salary Range</p>
                        <p>{formData.data.salaryRange}</p>
                      </div>
                    )}
                  </div>
                  {formData.data?.skillsRequired && (
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Skills Required</p>
                      <p className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-slate-700 mt-1">
                        {formData.data.skillsRequired}
                      </p>
                    </div>
                  )}
                  {formData.data?.explanation && (
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Explanation</p>
                      <p className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-slate-700 mt-1">
                        {formData.data.explanation}
                      </p>
                    </div>
                  )}
                  {formData.data?.remarks && (
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Remarks</p>
                      <p className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-slate-700 mt-1">
                        {formData.data.remarks}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {formData.type === "training-request" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Employee Name</p>
                      <p className="font-medium">{formData.data?.fullName || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Employee Code</p>
                      <p>{formData.data?.employeeCode || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Department</p>
                      <p>{formData.data?.departmentName || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Position</p>
                      <p>{formData.data?.position || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Training Title</p>
                      <p className="font-medium">{formData.data?.trainingTitle || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Training Provider</p>
                      <p>{formData.data?.trainingProvider || "TBD"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Training Mode</p>
                      <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-800/30">
                        {formData.data?.trainingMode || "Not specified"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Employee Category</p>
                      <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-800/30">
                        {formData.data?.employeeCategory || "Not specified"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Start Date</p>
                      <p>{formData.data?.startDate ? formatDate(formData.data.startDate) : "TBD"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">End Date</p>
                      <p>{formData.data?.endDate ? formatDate(formData.data.endDate) : "TBD"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Training Location</p>
                      <p>{formData.data?.trainingLocation || "TBD"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Duration</p>
                      <p>{formData.data?.trainingDuration || "TBD"}</p>
                    </div>
                  </div>

                  {formData.data?.accommodationRequired && (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Accommodation Details</p>
                      <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-slate-700">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="font-medium">Check-in Date:</span>{" "}
                            {formData.data?.checkInDate ? formatDate(formData.data.checkInDate) : "TBD"}
                          </div>
                          <div>
                            <span className="font-medium">Nights:</span> {formData.data?.nights || "TBD"}
                          </div>
                          {formData.data?.preferredAccommodation && (
                            <div className="col-span-2">
                              <span className="font-medium">Preferred Accommodation:</span>{" "}
                              {formData.data.preferredAccommodation}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.data?.trainingObjectives && (
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Training Objectives</p>
                      <p className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-slate-700 mt-1">
                        {formData.data.trainingObjectives}
                      </p>
                    </div>
                  )}

                  {formData.data?.contactInfo && (
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Contact Information</p>
                      <p className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-slate-700 mt-1">
                        {formData.data.contactInfo}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Supporting Documents */}
          {formData.type === "leave" && supportingDocuments.hasDocuments && (
            <Card className="mb-6 print-card">
              <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b pb-3 print-card-header">
                <CardTitle className="text-base flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-teal-500" />
                  Supporting Documents
                </CardTitle>
              </CardHeader>

              <CardContent className="pt-4 print-card-content">
                <div className="space-y-3">
                  {/* Show confirmation that documents were uploaded */}
                  {supportingDocuments.files.length > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="flex-shrink-0">
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-green-800 dark:text-green-300">
                          Supporting Document Submitted
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400">
                          {supportingDocuments.files.length} document{supportingDocuments.files.length > 1 ? "s" : ""}{" "}
                          uploaded:{" "}
                          {supportingDocuments.files.map((doc: UploadedDocumentFile) => doc.documentType).join(", ")}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Show document types that were required */}
                  {supportingDocuments.types.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {supportingDocuments.types.map((docType: string, index: number) => (
                        <Badge key={index} className="bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
                          <Paperclip className="h-3 w-3 mr-1" />
                          {docType}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Show message if only types selected but no files uploaded */}
                  {supportingDocuments.types.length > 0 && supportingDocuments.files.length === 0 && (
                    <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <div className="flex-shrink-0">
                        <Paperclip className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Documents Required</p>
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          Documents were requested but no files were uploaded
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Approvals Section - Rendered by the helper function */}
          {renderApprovalSection()}

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
                {companyInfo.name} &copy; {new Date().getFullYear()}
              </p>
            </div>
            <div>
              <p>{companyInfo.email}</p>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons - Hidden in Print */}
        {canApprove && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="max-w-4xl mx-auto mt-6 no-print print:hidden"
          >
            <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <CardFooter className="border-t pt-4 flex justify-end gap-2">
                {/* CHANGE: Fixed: Reject button was opening wrong dialog and had wrong text on Approve button */}
                <Dialog
                  open={dialogStates.isRejectDialogOpen}
                  onOpenChange={(open) => handleDialogChange("isRejectDialogOpen", open)}
                >
                  <DialogTrigger asChild>
                    <Button
                      disabled={loadingStates.isSubmitting}
                      variant="destructive"
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
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
                          value={formStates.rejectionReason}
                          onChange={(e) => handleFormStateChange("rejectionReason", e.target.value)}
                          rows={4}
                          required
                        />
                      </div>
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleDialogChange("isRejectDialogOpen", false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" variant="destructive" disabled={loadingStates.isSubmitting}>
                          {loadingStates.isSubmitting ? "Rejecting..." : "Reject Request"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                <Dialog
                  open={dialogStates.isProcessDialogOpen}
                  onOpenChange={(open) => handleDialogChange("isProcessDialogOpen", open)}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2 bg-transparent">
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
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleDialogChange("isProcessDialogOpen", false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={loadingStates.isSubmitting}
                          className="bg-teal-600 hover:bg-teal-700"
                        >
                          {loadingStates.isSubmitting ? "Processing..." : "Mark as In Process"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                <Dialog
                  open={dialogStates.isApproveDialogOpen}
                  onOpenChange={(open) => handleDialogChange("isApproveDialogOpen", open)}
                >
                  <DialogTrigger asChild>
                    <Button
                      className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700"
                      disabled={loadingStates.isSubmitting || alreadyApprovedByMe}
                    >
                      <CheckCircle className="h-4 w-4" />
                      {alreadyApprovedByMe ? "Already Approved" : "Approve"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto">
                    <form onSubmit={handleApprove}>
                      <DialogHeader>
                        <DialogTitle>Approve Request</DialogTitle>
                        <DialogDescription>
                          {userRole === "supervisor"
                            ? "Supervisor Signature"
                            : userRole === "leader"
                              ? "Leader / QC Supervisor Signature"
                              : userRole === "hrd" && formData.type === "overtime"
                                ? "HRD Signature" // For overtime, HRD approves
                                : "HRD Signature"}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4 space-y-4">
                        <Textarea
                          placeholder="Comments (optional)"
                          value={formStates.comments}
                          onChange={(e) => handleFormStateChange("comments", e.target.value)}
                          rows={2}
                        />

                        {/* Signature Section */}
                        <div className="space-y-3">
                          <h3 className="text-sm font-medium">
                            {userRole === "supervisor"
                              ? "Supervisor Signature"
                              : userRole === "leader"
                                ? "Leader / QC Supervisor Signature"
                                : userRole === "hrd" && formData.type === "overtime"
                                  ? "HRD Signature" // For overtime, HRD approves
                                  : "Your Signature"}
                          </h3>
                          <Tabs
                            defaultValue="draw"
                            onValueChange={(value) => handleFormStateChange("signatureMethod", value)}
                          >
                            <TabsList className="mb-2">
                              <TabsTrigger value="draw">Draw Signature</TabsTrigger>
                              <TabsTrigger value="upload">Upload Signature</TabsTrigger>
                            </TabsList>

                            <TabsContent value="draw" className="space-y-2">
                              <div className="border rounded-md p-2 bg-white w-full">
                                <SignatureCanvas
                                  ref={signatureRef}
                                  canvasProps={{
                                    className: "w-full h-32 border rounded-md",
                                    style: { width: "100%", height: "120px" },
                                  }}
                                />
                              </div>
                              <Button type="button" variant="outline" size="sm" onClick={clearSignature}>
                                Clear Signature
                              </Button>
                            </TabsContent>

                            <TabsContent value="upload" className="space-y-2">
                              <div className="flex flex-col items-center justify-center border rounded-md p-4 bg-white">
                                {formStates.uploadedSignature ? (
                                  <div className="flex flex-col items-center">
                                    <Image
                                      src={formStates.uploadedSignature || "/placeholder.svg"}
                                      alt="Uploaded Signature"
                                      width={200}
                                      height={100}
                                      className="mb-2 border max-w-full h-auto"
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleFormStateChange("uploadedSignature", null)}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Remove
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center">
                                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                                    <p className="text-xs text-muted-foreground mb-2 text-center">
                                      Upload signature (PNG/JPG)
                                    </p>
                                    <Input
                                      id="signature-upload"
                                      type="file"
                                      accept="image/*"
                                      onChange={handleSignatureUpload}
                                      className="max-w-[200px] text-xs"
                                    />
                                  </div>
                                )}
                              </div>
                            </TabsContent>
                          </Tabs>
                        </div>

                        {/* Operation Manager Signature Section */}
                        {userRole === "hrd" && formData.type === "overtime" && (
                          <div className="space-y-3">
                            <h3 className="text-sm font-medium">Operation Manager Signature (Optional)</h3>
                            <Tabs
                              defaultValue="draw"
                              onValueChange={(value) => handleFormStateChange("pmSignatureMethod", value)}
                            >
                              <TabsList className="mb-2">
                                <TabsTrigger value="draw">Draw Signature</TabsTrigger>
                                <TabsTrigger value="upload">Upload Signature</TabsTrigger>
                              </TabsList>

                              <TabsContent value="draw" className="space-y-2">
                                <div className="border rounded-md p-2 bg-white w-full">
                                  <SignatureCanvas
                                    ref={pmSignatureRef}
                                    canvasProps={{
                                      className: "w-full h-32 border rounded-md",
                                      style: { width: "100%", height: "120px" },
                                    }}
                                  />
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={clearPmSignature}>
                                  Clear Signature
                                </Button>
                              </TabsContent>

                              <TabsContent value="upload" className="space-y-2">
                                <div className="flex flex-col items-center justify-center border rounded-md p-4 bg-white">
                                  {formStates.pmUploadedSignature ? (
                                    <div className="flex flex-col items-center">
                                      <Image
                                        src={formStates.pmUploadedSignature || "/placeholder.svg"}
                                        alt="Operation Manager Signature"
                                        width={200}
                                        height={100}
                                        className="mb-2 border max-w-full h-auto"
                                      />
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleFormStateChange("pmUploadedSignature", null)}
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Remove
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-center">
                                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                                      <p className="text-xs text-muted-foreground mb-2 text-center">
                                        Upload signature (PNG/JPG) - Optional
                                      </p>
                                      <Input
                                        id="pm-signature-upload"
                                        type="file"
                                        accept="image/*"
                                        onChange={handlePmSignatureUpload}
                                        className="max-w-[200px] text-xs"
                                      />
                                    </div>
                                  )}
                                </div>
                              </TabsContent>
                            </Tabs>
                          </div>
                        )}

                        {userRole === "hrd" && formData.type === "overtime" && (
                          <div className="space-y-3">
                            <div className="p-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-md">
                              <h3 className="text-xs font-medium text-amber-800 dark:text-amber-300">
                                Supervisor Signature (Optional - If Supervisor on Leave)
                              </h3>
                              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                Fill this if supervisor is on leave. This will mark supervisor approval as complete.
                              </p>
                            </div>
                            <Tabs
                              defaultValue="draw"
                              onValueChange={(value) => handleFormStateChange("supervisorSignatureMethod", value)}
                            >
                              <TabsList className="mb-2">
                                <TabsTrigger value="draw">Draw Signature</TabsTrigger>
                                <TabsTrigger value="upload">Upload Signature</TabsTrigger>
                              </TabsList>

                              <TabsContent value="draw" className="space-y-2">
                                <div className="border rounded-md p-2 bg-white w-full">
                                  <SignatureCanvas
                                    ref={supervisorSignatureRef}
                                    canvasProps={{
                                      className: "w-full h-32 border rounded-md",
                                      style: { width: "100%", height: "120px" },
                                    }}
                                  />
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={clearSupervisorSignature}>
                                  Clear Signature
                                </Button>
                              </TabsContent>

                              <TabsContent value="upload" className="space-y-2">
                                <div className="flex flex-col items-center justify-center border rounded-md p-4 bg-white">
                                  {formStates.supervisorUploadedSignature ? (
                                    <div className="flex flex-col items-center">
                                      <Image
                                        src={formStates.supervisorUploadedSignature || "/placeholder.svg"}
                                        alt="Supervisor Signature"
                                        width={200}
                                        height={100}
                                        className="mb-2 border max-w-full h-auto"
                                      />
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleFormStateChange("supervisorUploadedSignature", null)}
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Remove
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-center">
                                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                                      <p className="text-xs text-muted-foreground mb-2 text-center">
                                        Upload signature (PNG/JPG) - Optional
                                      </p>
                                      <Input
                                        id="supervisor-signature-upload"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleSupervisorSignatureUpload}
                                        className="max-w-[200px] text-xs"
                                      />
                                    </div>
                                  )}
                                </div>
                              </TabsContent>
                            </Tabs>
                          </div>
                        )}
                      </div>
                      <DialogFooter className="gap-2">
                        <DialogClose asChild>
                          <Button type="button" variant="outline">
                            Cancel
                          </Button>
                        </DialogClose>
                        <Button
                          type="submit"
                          disabled={loadingStates.isSubmitting || alreadyApprovedByMe}
                          className="bg-teal-600 hover:bg-teal-700"
                        >
                          {alreadyApprovedByMe
                            ? "Already Approved"
                            : loadingStates.isSubmitting
                              ? "Approving..."
                              : "Approve Request"}
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

      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Document Preview</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center overflow-auto">
            {previewImage && (
              <Image
                src={previewImage || "/placeholder.svg"}
                alt="Document Preview"
                width={800}
                height={600}
                className="object-contain max-h-[70vh]"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Print Styles */}
      <style jsx>{`
          @media print {
            * {
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
              box-sizing: border-box !important;
            }
            
            body * {
              visibility: hidden !important;
            }
            
            #printContent, #printContent * {
              visibility: visible !important;
            }
            
            @page {
              size: A4 portrait;
              margin: 5mm 5mm 5mm 5mm;
            }
            
            html, body {
              height: 297mm !important;
              max-height: 297mm !important;
              overflow: hidden !important;
              font-size: 9pt !important;
              line-height: 1.1 !important;
              /* Hide scrollbar */
              scrollbar-width: none !important;
              -ms-overflow-style: none !important;
            }
            
            html::-webkit-scrollbar,
            body::-webkit-scrollbar,
            *::-webkit-scrollbar {
              display: none !important;
              width: 0 !important;
              height: 0 !important;
            }
            
            #printContent {
              position: relative !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              max-width: none !important;
              height: 285mm !important;
              max-height: 285mm !important;
              padding: 0 !important;
              margin: 0 !important;
              background-color: white !important;
              box-shadow: none !important;
              border: none !important;
              border-radius: 0 !important;
              font-size: 9pt !important;
              line-height: 1.1 !important;
              transform: scale(0.78) !important;
              transform-origin: top left !important;
              overflow: hidden !important;
              display: flex !important;
              flex-direction: column !important;
              page-break-inside: avoid !important;
            }
            
            /* Hide status badges, buttons, and scrollbar in print */
            .no-print,
            .print\\:hidden,
            .status-badge,
            .approval-status-badge,
            [class*="FormStatusBadge"],
            button,
            [class*="motion"]:first-child,
            .flex.justify-between.items-center.mb-6,
            .sticky,
            .fixed {
              display: none !important;
              visibility: hidden !important;
              height: 0 !important;
              width: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            
            .company-header {
              display: flex !important;
              align-items: center !important;
              justify-content: space-between !important;
              border-bottom: 1px solid #0f766e !important;
              padding-bottom: 2px !important;
              margin-bottom: 3px !important;
              font-size: 10pt !important;
              page-break-after: avoid !important;
            }
            
            .company-header h1 {
              font-size: 12pt !important;
              font-weight: bold !important;
              color: #0f766e !important;
              margin: 0 !important;
            }
            
            .form-title {
              font-size: 11pt !important;
              font-weight: bold !important;
              text-align: center !important;
              margin: 2px 0 3px 0 !important;
              color: #0f766e !important;
              text-transform: uppercase !important;
              letter-spacing: 0.3px !important;
              page-break-after: avoid !important;
            }
            
            .print-card,
            .bg-white.dark\\:bg-gray-800,
            .border.rounded-lg,
            .employee-section,
            .request-details-section,
            .approvals-section {
              border: 1px solid #d1d5db !important;
              border-radius: 2px !important;
              margin-bottom: 2px !important;
              page-break-inside: avoid !important;
              page-break-before: avoid !important;
              page-break-after: avoid !important;
              background-color: white !important;
              break-inside: avoid !important;
              break-before: avoid !important;
              break-after: avoid !important;
              overflow: hidden !important;
              flex-shrink: 1 !important;
            }
            
            .print-card-header,
            .bg-gray-50.dark\\:bg-gray-700 {
              background-color: #f9fafb !important;
              padding: 2px 6px !important;
              border-bottom: 1px solid #d1d5db !important;
              border-radius: 2px 2px 0 0 !important;
              font-size: 9pt !important;
              font-weight: 600 !important;
              color: #374151 !important;
              page-break-after: avoid !important;
              margin: 0 !important;
            }

            h1, h2, h3, h4, h5, h6 {
              margin-top: 2px !important;
              margin-bottom: 1px !important;
              font-size: 9pt !important;
              font-weight: 600 !important;
              color: #374151 !important;
              page-break-after: avoid !important;
              line-height: 1.1 !important;
            }
            
            p, div, span {
              margin-top: 0px !important;
              margin-bottom: 1px !important;
              line-height: 1.1 !important;
              font-size: 8pt !important;
              color: #374151 !important;
            }
            
            .grid {
              gap: 2px !important;
            }
            
            .flex {
              gap: 2px !important;
            }
            
            .space-y-6 > * + *,
            .space-y-4 > * + *,
            .space-y-2 > * + * {
              margin-top: 2px !important;
            }
            
            .inline-flex,
            .px-2.py-1 {
              font-size: 7pt !important;
              padding: 1px 3px !important;
              border-radius: 2px !important;
            }
            
            .text-sm {
              font-size: 8pt !important;
            }
            
            .text-xs {
              font-size: 7pt !important;
            }
            
            .signature-section {
              margin-top: 2px !important;
              page-break-inside: avoid !important;
              min-height: 35px !important;
              max-height: 35px !important;
              overflow: hidden !important;
            }
            
            .signature-line {
              border-top: 1px solid #000 !important;
              margin-top: 5px !important;
              padding-top: 1px !important;
              font-size: 7pt !important;
              text-align: center !important;
            }
            
            .signature-field {
              width: 45% !important;
              display: inline-block !important;
              margin: 0 2.5% !important;
            }
            
            .company-footer {
              border-top: 1px solid #0f766e !important;
              padding-top: 2px !important;
              margin-top: 3px !important;
              font-size: 7pt !important;
              color: #6b7280 !important;
              text-align: center !important;
              page-break-inside: avoid !important;
            }
            
            .max-w-4xl,
            .container {
              max-width: none !important;
              width: 100% !important;
              height: auto !important;
              max-height: 290mm !important;
              overflow: hidden !important;
            }
            
            .mx-auto {
              margin-left: 0 !important;
              margin-right: 0 !important;
            }
            
            .px-4,
            .px-6,
            .px-8 {
              padding-left: 2px !important;
              padding-right: 2px !important;
            }
            
            .py-4,
            .py-6,
            .py-8 {
              padding-top: 1px !important;
              padding-bottom: 1px !important;
            }
            
            .p-4,
            .p-6 {
              padding: 2px !important;
            }
            
            .m-4,
            .m-6,
            .mb-4,
            .mb-6,
            .mt-4,
            .mt-6 {
              margin: 1px !important;
            }
            
            .print-only {
              display: block !important;
              visibility: visible !important;
            }
            
            * {
              orphans: 1 !important;
              widows: 1 !important;
              page-break-inside: avoid !important;
              page-break-before: avoid !important;
              page-break-after: avoid !important;
              break-inside: avoid !important;
              break-before: avoid !important;
              break-after: avoid !important;
            }
            
            .force-page-break {
              page-break-before: avoid !important;
            }
            
            .card-content,
            .p-4,
            .p-6 {
              padding: 2px 4px !important;
            }
            
            .form-row,
            .grid-cols-2 > *,
            .flex > * {
              margin: 1px !important;
              padding: 1px 2px !important;
            }
            
            .employee-info,
            .request-details,
            .approvals {
              padding: 3px !important;
              margin: 2px 0 !important;
            }
            
            .min-h-screen,
            .min-h-full {
              min-height: auto !important;
            }
          }

          @media screen {
            .print-only {
              display: none !important;
            }
          }
        `}</style>
    </div>
  )
})

export default FormDetails
