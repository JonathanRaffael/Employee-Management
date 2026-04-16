import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import * as XLSX from "xlsx"
import { jsPDF } from "jspdf"
import { endOfDay, startOfWeek, startOfMonth, startOfYear, endOfWeek, endOfMonth, endOfYear, format } from "date-fns"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendMail } from "@/lib/mail"

// Define a type for the session user
interface SessionUser {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
  role: string
}

interface CustomSession {
  user: SessionUser
}

interface LeaveBalance {
  daysRequested: number
  remainingAfter: number
}

interface UploadedDocumentFile {
  documentType: string
  fileName: string
  fileData: string
}

interface LeaveFormData {
  employees: { name: string; position: string; employeeCode: string; department: string }[]
  leaveType: string
  startDate: string
  endDate: string
  totalDays: string
  reason: string
  supportingDocuments: string[]
  uploadedDocumentFiles?: UploadedDocumentFile[]
  leaveBalance?: LeaveBalance
  dateSelectionMode?: "range" | "manual"
  manualDates?: string[]
}

interface FormSubmissionData {
  type: string
  formData: LeaveFormData
  signature: string
  supportingDocuments: string[]
  jumlahHariCuti: number
}

// Optimized cache with better performance
class HighPerformanceCache {
  private cache = new Map<string, { data: any; timestamp: number; size: number; hits: number }>()
  private totalSize = 0
  private readonly maxSize: number
  private readonly maxTotalSize: number
  private readonly ttl: number

  constructor(maxSize = 100, maxTotalSize = 50 * 1024 * 1024, ttl = 60000) {
    this.maxSize = maxSize
    this.maxTotalSize = maxTotalSize
    this.ttl = ttl
  }

  get(key: string) {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() - entry.timestamp > this.ttl) {
      this.totalSize -= entry.size
      this.cache.delete(key)
      return null
    }

    entry.hits++
    return entry.data
  }

  set(key: string, data: any) {
    const dataSize = this.estimateSize(data)
    this.cleanup()

    while ((this.cache.size >= this.maxSize || this.totalSize + dataSize > this.maxTotalSize) && this.cache.size > 0) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        const oldEntry = this.cache.get(oldestKey)
        if (oldEntry) {
          this.totalSize -= oldEntry.size
        }
        this.cache.delete(oldestKey)
      } else {
        break
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      size: dataSize,
      hits: 0,
    })
    this.totalSize += dataSize
  }

  private estimateSize(obj: any): number {
    return JSON.stringify(obj).length * 2
  }

  private cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.totalSize -= entry.size
        this.cache.delete(key)
      }
    }
  }

  clear() {
    this.cache.clear()
    this.totalSize = 0
  }
}

import { formCache, countCache } from "@/lib/form-cache"

setInterval(() => {
  formCache.clear()
  countCache.clear()
}, 120000)

function generateCacheKey(params: URLSearchParams, userId: string, role: string): string {
  const sortedParams = Array.from(params.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, value]) => `${key}=${value}`)
    .join("&")

  return `${userId}:${role}:${sortedParams}`
}

function formatManualDatesForEmail(manualDates: string[]): string {
  if (!manualDates || manualDates.length === 0) return "N/A"

  const sortedDates = [...manualDates].sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
  return sortedDates.map((date) => format(new Date(date), "dd MMM yyyy")).join(", ")
}

function getLeaveeDateDisplay(formData: any): string {
  if (formData.dateSelectionMode === "manual" && formData.manualDates && formData.manualDates.length > 0) {
    return formatManualDatesForEmail(formData.manualDates)
  }

  const startDate = formData.startDate ? new Date(formData.startDate).toLocaleDateString() : "N/A"
  const endDate = formData.endDate ? new Date(formData.endDate).toLocaleDateString() : "N/A"
  return `${startDate} - ${endDate}`
}

function sendNewFormNotification(form: any, user: SessionUser) {
  setImmediate(async () => {
    try {
      const formType =
        form.type === "leave"
          ? "Leave Request"
          : form.type === "overtime"
            ? "Overtime Request"
            : form.type === "training-request"
              ? "Training Request"
              : form.type === "job-requisition"
                ? "Job Requisition"
                : form.type.charAt(0).toUpperCase() + form.type.slice(1)
      const formNumber = form.formNumber ? form.formNumber.toString().padStart(4, "0") : form.id

      const subject = `New ${formType} Form #${formNumber} Submitted`

      const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString()
      }

      let supportingDocsHtml = ""
      const uploadedDocumentFiles: UploadedDocumentFile[] = form.data?.uploadedDocumentFiles || []
      const supportingDocTypes: string[] = form.data?.supportingDocuments || []

      const emailAttachments: Array<{
        filename: string
        content: Buffer
        contentType: string
        cid: string
      }> = []

      if (uploadedDocumentFiles.length > 0) {
        for (let i = 0; i < uploadedDocumentFiles.length; i++) {
          const doc = uploadedDocumentFiles[i]
          if (doc.fileData && doc.fileData.startsWith("data:")) {
            try {
              const matches = doc.fileData.match(/^data:([^;]+);base64,(.+)$/)
              if (matches) {
                const contentType = matches[1]
                const base64Data = matches[2]
                const buffer = Buffer.from(base64Data, "base64")
                const cid = `doc_${i}_${Date.now()}`

                emailAttachments.push({
                  filename: doc.fileName || `document_${i + 1}.jpg`,
                  content: buffer,
                  contentType: contentType,
                  cid: cid,
                })
              }
            } catch (err) {
              console.error(`Failed to process document ${doc.fileName}:`, err)
            }
          }
        }
      }

      if (uploadedDocumentFiles.length > 0 || supportingDocTypes.length > 0) {
        supportingDocsHtml = `
          <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 5px; padding: 15px; margin: 15px 0;">
            <h3 style="margin-top: 0; color: #166534;">📎 Supporting Documents</h3>
        `

        if (supportingDocTypes.length > 0) {
          supportingDocsHtml += `
            <p style="margin-bottom: 10px;"><strong>Document Types Required:</strong></p>
            <ul style="margin: 0; padding-left: 20px;">
              ${supportingDocTypes.map((docType: string) => `<li>${docType}</li>`).join("")}
            </ul>
          `
        }

        if (uploadedDocumentFiles.length > 0 && emailAttachments.length > 0) {
          supportingDocsHtml += `
            <p style="margin-top: 15px; margin-bottom: 10px;"><strong>Uploaded Documents (${emailAttachments.length} file${emailAttachments.length > 1 ? "s" : ""}):</strong></p>
          `

          for (let i = 0; i < emailAttachments.length; i++) {
            const attachment = emailAttachments[i]
            const docInfo = uploadedDocumentFiles[i]

            supportingDocsHtml += `
              <div style="margin-bottom: 15px; padding: 10px; background-color: white; border: 1px solid #d1d5db; border-radius: 5px;">
                <p style="margin: 0 0 8px 0; font-weight: bold; color: #0f766e;">📄 ${docInfo?.documentType || "Document"}</p>
                <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280;">File: ${attachment.filename}</p>
                <img src="cid:${attachment.cid}" alt="${docInfo?.documentType || "Document"}" style="max-width: 100%; max-height: 400px; border: 1px solid #e5e7eb; border-radius: 4px; display: block;" />
              </div>
            `
          }

          supportingDocsHtml += `
            <p style="margin-top: 10px; font-size: 12px; color: #6b7280; font-style: italic;">
              💡 Tip: The documents are also attached to this email for easy download.
            </p>
          `
        } else if (uploadedDocumentFiles.length > 0) {
          supportingDocsHtml += `
            <p style="margin-top: 15px; margin-bottom: 10px;"><strong>Uploaded Documents:</strong></p>
            <p style="color: #166534;">✓ ${uploadedDocumentFiles.length} document(s) submitted with this request.</p>
          `
        }

        supportingDocsHtml += `</div>`
      }

      const getLeaveDetailsHtml = () => {
        if (form.type !== "leave") return ""

        const isManualDates =
          form.data.dateSelectionMode === "manual" && form.data.manualDates && form.data.manualDates.length > 0

        if (isManualDates) {
          const sortedDates = [...form.data.manualDates].sort(
            (a: string, b: string) => new Date(a).getTime() - new Date(b).getTime(),
          )
          const formattedDates = sortedDates.map((date: string) => format(new Date(date), "dd MMM yyyy"))

          return `
            <p><strong>Leave Type:</strong> ${form.data.leaveType}</p>
            <p><strong>Date Selection:</strong> Non-consecutive (Manual)</p>
            <p><strong>Selected Dates (${formattedDates.length}):</strong></p>
            <ul style="margin: 5px 0; padding-left: 20px;">
              ${formattedDates.map((date: string) => `<li>${date}</li>`).join("")}
            </ul>
            <p><strong>Total Days:</strong> ${form.data.totalDays}</p>
          `
        }

        return `
          <p><strong>Leave Type:</strong> ${form.data.leaveType}</p>
          <p><strong>Date Range:</strong> ${formatDate(form.data.startDate)} - ${formatDate(form.data.endDate)}</p>
          <p><strong>Total Days:</strong> ${form.data.totalDays}</p>
        `
      }

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0f766e;">New ${formType} Form Submitted</h2>
          <p>A new ${formType.toLowerCase()} form has been submitted and requires your attention.</p>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 5px; padding: 15px; margin: 15px 0;">
            <h3 style="margin-top: 0;">Form Details:</h3>
            <p><strong>Form Type:</strong> ${formType}</p>
            <p><strong>Form ID:</strong> ${formNumber}</p>
            <p><strong>Submitted By:</strong> ${
              Array.isArray(form.data.employees) && form.data.employees.length > 0
                ? `${form.data.employees[0].name} (${form.data.employees[0].employeeCode ?? ""})`
                : user.name || "Employee"
            }</p>
            <p><strong>Submitted On:</strong> ${formatDate(new Date().toISOString())}</p>
            ${
              form.type === "leave"
                ? getLeaveDetailsHtml()
                : form.type === "overtime"
                  ? `<p><strong>Date:</strong> ${formatDate(form.data.date)}</p>
                    <p><strong>Time Range:</strong> ${form.data.startTime} - ${form.data.endTime}</p>`
                  : form.type === "training-request"
                    ? `<p><strong>Training Title:</strong> ${form.data.trainingTitle}</p>
                      <p><strong>Training Provider:</strong> ${form.data.trainingProvider}</p>
                      <p><strong>Start Date:</strong> ${formatDate(form.data.startDate)}</p>
                      <p><strong>End Date:</strong> ${formatDate(form.data.endDate)}</p>`
                    : form.type === "job-requisition"
                      ? `<p><strong>Request Position:</strong> ${form.data.jobRequisition.requestPosition}</p>
                        <p><strong>Department Name:</strong> ${form.data.jobRequisition.departmentName}</p>
                        <p><strong>Expected Start Date:</strong> ${formatDate(form.data.jobRequisition.expectedStartDate)}</p>`
                      : `<p><strong>Details:</strong> ${form.data.details}</p>`
            }
            <p><strong>Reason:</strong> ${form.data.reason}</p>
          </div>
          
          ${supportingDocsHtml}
          
          <p>Please log in to the system to review and process this request.</p>
          <p>This is an automated notification. Please do not reply to this email.</p>
        </div>
      `

      const recipients: string[] = []

      if (form.type === "leave") {
        const hrdEmail = process.env.HRD_EMAIL
        if (hrdEmail) {
          recipients.push(...hrdEmail.split(",").map((email) => email.trim()))
        }
      } else if (form.type === "overtime") {
        const adminEmail = "admn.htmf@gmail.com"
        const supervisorEmail = process.env.SUPERVISOR_EMAIL || process.env.supervisor_EMAIL

        recipients.push(adminEmail)

        if (supervisorEmail) {
          recipients.push(...supervisorEmail.split(",").map((email) => email.trim()))
        }

        console.log(`📧 Overtime notification will be sent to: ${recipients.join(", ")}`)
        console.log(`📧 Excluding meliana.htm@gmail.com from overtime notifications as requested`)
      } else if (form.type === "training-request") {
        const hrdEmail = process.env.HRD_EMAIL
        if (hrdEmail) {
          recipients.push(...hrdEmail.split(",").map((email) => email.trim()))
        }
      } else if (form.type === "job-requisition") {
        const hrdEmail = process.env.HRD_EMAIL
        if (hrdEmail) {
          recipients.push(...hrdEmail.split(",").map((email) => email.trim()))
        }
      } else {
        const hrdEmail = process.env.HRD_EMAIL
        if (hrdEmail) {
          recipients.push(...hrdEmail.split(",").map((email) => email.trim()))
        }
      }

      const uniqueRecipients = [...new Set(recipients)]

      if (uniqueRecipients.length > 0) {
        const emailPromises = uniqueRecipients.map((recipient) =>
          sendMail({
            to: recipient,
            subject,
            html: htmlContent,
            attachments: emailAttachments.length > 0 ? emailAttachments : undefined,
          }),
        )

        await Promise.all(emailPromises)
        console.log(`✅ New form notification emails sent to ${uniqueRecipients.join(", ")}`)

        if (emailAttachments.length > 0) {
          console.log(
            `📎 Email included ${emailAttachments.length} supporting document(s) as embedded images and attachments`,
          )
        }
      } else {
        console.warn("⚠️ No email recipients configured for form notifications")
      }
    } catch (error) {
      console.error("❌ Error sending new form notification emails:", error)
    }
  })
}

async function getNextFormNumber(): Promise<number> {
  try {
    const maxRetries = 3
    let attempt = 0

    while (attempt < maxRetries) {
      try {
        const result = await prisma.$queryRaw<{ max_form_number: number | null }[]>`
          SELECT COALESCE(MAX("formNumber"), 0) as max_form_number FROM "Form"
        `

        let maxFormNumber = result[0]?.max_form_number || 0
        maxFormNumber = Number(maxFormNumber)

        if (isNaN(maxFormNumber)) {
          maxFormNumber = 0
        }

        const nextFormNumber = maxFormNumber + 1
        console.log(`Next form number: ${nextFormNumber} (attempt ${attempt + 1})`)

        return nextFormNumber
      } catch (error) {
        attempt++
        if (attempt >= maxRetries) throw error
        await new Promise((resolve) => setTimeout(resolve, 100 * attempt))
      }
    }

    throw new Error("Failed to generate form number after retries")
  } catch (error) {
    console.error("Error getting next form number:", error)
    throw new Error("Failed to generate form number")
  }
}

export async function POST(request: Request) {
  try {
    // =========================
    // AUTH (FIXED)
    // =========================
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: "Authenticated user not found in database" }, { status: 401 })
    }

    // =========================
    // REQUEST BODY
    // =========================
    const data = await request.json()
    const formData = data.formData || data.data || {}

    console.log("[v0] Received form data:", {
      type: data.type,
      hasFormData: !!data.formData,
      hasData: !!data.data,
      formDataKeys: Object.keys(formData),
      hasSupportingDocs: !!formData.supportingDocuments,
      hasUploadedDocs: !!formData.uploadedDocumentFiles,
      uploadedDocsCount: formData.uploadedDocumentFiles?.length || 0,
      dateSelectionMode: formData.dateSelectionMode,
      manualDatesCount: formData.manualDates?.length || 0,
    })

    if (!formData || Object.keys(formData).length === 0) {
      console.log("[v0] Form data validation failed:", {
        formData,
        dataKeys: Object.keys(data),
      })
      return NextResponse.json({ error: "Form data is required" }, { status: 400 })
    }

    // =========================
    // EMPLOYEE LOOKUP (FIXED)
    // =========================
    let employee = await prisma.employee.findUnique({
      where: { userId: user.id },
    })

    // (lanjutkan kode lu setelah ini tanpa diubah)

    /* =================================================
   ENSURE EMPLOYEE EXISTS (DECLARE ONCE)
================================================= */
    employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
    })

    if (!employee) {
      const employeeCount = await prisma.employee.count()
      const employeeCode = `EMP${String(employeeCount + 1).padStart(4, "0")}`

      employee = await prisma.employee.create({
        data: {
          userId: session.user.id,
          employeeCode,
          name: user.name ?? "Unknown",
          department: user.department ?? "Unknown",
          position: user.position ?? "Unknown",
          isActive: true,
        },
      })

      console.log(`✅ Created Employee ${employee.employeeCode} for user ${session.user.id}`)
    }

    /* =================================================
   LEAVE CALCULATION
================================================= */
    if (data.type === "leave") {
      const jumlahHari = data.jumlahHariCuti || Number.parseInt(formData?.totalDays || "0") || 0

      formData.jumlahHari = jumlahHari
    }

    /* =================================================
   FORM NUMBER
================================================= */
    const nextFormNumber = await getNextFormNumber()

    /* =================================================
   FORM STATUS (APPROVAL-BASED)
================================================= */
    const initialStatus = "PENDING"

    /* =================================================
   APPROVAL SETUP (SINGLE SOURCE OF TRUTH)
================================================= */
    const approvals: {
      role: string
      status: string
      approverId?: string
      signature?: string | null
      comments?: string
    }[] = []

    // ✅ LEADER AUTO-APPROVED SAAT SUBMIT
    approvals.push({
      role: "LEADER",
      status: "APPROVED",
      approverId: session.user.id,
      signature: data.signature ?? null,
      comments: "Auto-approved on submission",
    })

    // ✅ HRD MENUNGGU APPROVAL
    approvals.push({
      role: "HRD",
      status: "PENDING",
    })

    let form

    if (data.type === "training-request") {
      form = await prisma.form.create({
        data: {
          formNumber: nextFormNumber,
          type: data.type,
          status: initialStatus,
          data: {
            ...formData,
            trainingRequest: {
              fullName: formData.fullName || "",
              departmentName: formData.departmentName || "",
              position: formData.position || "",
              contactInfo: formData.contactInfo || "",
              trainingTitle: formData.trainingTitle || "",
              trainingProvider: formData.trainingProvider || "",
              startDate: formData.startDate ? new Date(formData.startDate) : null,
              endDate: formData.endDate ? new Date(formData.endDate) : null,
              trainingLocation: formData.trainingLocation || "",
              trainingMode: mapTrainingMode(formData.trainingMode || "inPerson"),
              trainingDuration: formData.trainingDuration || "",
              accommodationRequired: formData.accommodationRequired || false,
              checkInDate: formData.checkInDate ? new Date(formData.checkInDate) : null,
              nights: formData.nights ? Number.parseInt(formData.nights) : null,
              preferredAccommodation: formData.preferredAccommodation || "",
              trainingObjectives: formData.trainingObjectives || "",
              employeeCategory: mapEmployeeCategory(formData.employeeCategory || "staff"),
              supervisorName: formData.supervisorName || "",
              managerName: formData.managerName || "",
              hrStatus: "pending",
              hrComments: "",
            },
            leaderSignature: data.signature,
            leaderApprovalDate: new Date().toISOString(),
          },
          employee: { connect: { id: employee.id } },
          createdBy: { connect: { id: session.user.id } },
          supportingDocuments: data.supportingDocuments || [],
          approvals: {
            create: approvals,
          },
        },
        select: {
          id: true,
          formNumber: true,
          type: true,
          data: true,
        },
      })
    } else if (data.type === "job-requisition") {
      if (!formData.requestPosition) {
        return NextResponse.json({ error: "Request position is required for job requisition" }, { status: 400 })
      }

      form = await prisma.form.create({
        data: {
          formNumber: nextFormNumber,
          type: data.type,
          status: initialStatus,
          data: {
            ...formData,
            jobRequisition: {
              requestPosition: formData.requestPosition || "",
              departmentName: formData.departmentName || "",
              expectedStartDate: formData.expectedStartDate ? new Date(formData.expectedStartDate) : null,
              skillsRequired: formData.skillsRequired || "",
              explanation: formData.explanation || formData.briefExplanation || "",
              positionDuration: formData.positionDuration === "permanent" ? "PERMANENT" : "TEMPORARY",
              endDate: formData.temporaryEndDate ? new Date(formData.temporaryEndDate) : null,
              employmentType:
                formData.employmentStatus === "partTime"
                  ? "PART_TIME"
                  : formData.employmentStatus === "contract"
                    ? "CONTRACT"
                    : "FULL_TIME",
              salaryRange: formData.salaryRange || "",
              budgetStatus: formData.budgetStatus === "additional" ? "REQUIRES_ADDITIONAL" : "SUFFICIENT",
              remarks: formData.remarks || formData.hrRemarks || "",
            },
            leaderSignature: data.signature,
            leaderApprovalDate: new Date().toISOString(),
          },
          employee: { connect: { id: employee.id } },
          createdBy: { connect: { id: session.user.id } },
          supportingDocuments: data.supportingDocuments || [],
          approvals: {
            create: approvals,
          },
        },
        select: {
          id: true,
          formNumber: true,
          type: true,
          data: true,
        },
      })
    } else {
      form = await prisma.form.create({
        data: {
          formNumber: nextFormNumber,
          type: data.type,
          status: initialStatus,
          data: {
            ...formData,
            leaderSignature: data.signature,
            leaderApprovalDate: new Date().toISOString(),
          },
          employee: { connect: { id: employee.id } },
          createdBy: { connect: { id: session.user.id } },
          supportingDocuments: data.supportingDocuments || [],
          approvals: {
            create: approvals,
          },
        },
        select: {
          id: true,
          formNumber: true,
          type: true,
          data: true,
        },
      })
    }

    formCache.clear()
    countCache.clear()

    if (data.type === "leave") {
      const hrdUsers = await prisma.user.findMany({
        where: { role: "HRD" },
        select: { id: true },
      })

      if (hrdUsers.length > 0) {
        const formType = data.type === "leave" ? "Leave Request" : "Overtime Request"
        const formNumber = form.formNumber ? form.formNumber.toString().padStart(4, "0") : form.id

        const notificationData = hrdUsers.map((hrdUser) => ({
          title: `New ${formType} #${formNumber}`,
          message: `${session.user.name || "Employee"} submitted a ${formType.toLowerCase()} requiring approval`,
          userId: hrdUser.id,
          isRead: false,
        }))

        const notificationClient = (prisma as any)?.notification
        if (notificationClient?.createMany) {
          await notificationClient.createMany({
            data: notificationData,
          })
          console.log(`📧 Created ${notificationData.length} notifications for HRD users`)
        } else {
          console.warn("[v0] Prisma model 'notification' not found; skipping DB notifications")
        }
      }
    }

    sendNewFormNotification(form, session.user)

    return NextResponse.json({
      success: true,
      formId: form.id,
      formNumber: form.formNumber,
    })
  } catch (error) {
    console.error("Error creating form:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to create form"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const startTime = Date.now()
  const session = (await getServerSession(authOptions)) as CustomSession | null

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = session.user.role?.toUpperCase()

  const { searchParams } = new URL(request.url)
  const format = searchParams.get("format")
  const status = searchParams.get("status")
  const type = searchParams.get("type")
  const timeFilter = searchParams.get("timeFilter")
  const selectedMonthStr = searchParams.get("selectedMonth")
  const isStatsRequest = request.url.includes("/api/forms/stats")
  const getAllForms = searchParams.get("getAllForms") === "true" || isStatsRequest

  let selectedMonth: { month: number; year: number } | null = null
  if (selectedMonthStr) {
    try {
      selectedMonth = JSON.parse(selectedMonthStr)
    } catch (e) {
      console.error("Invalid selectedMonth format:", e)
    }
  }

  const page = Number.parseInt(searchParams.get("page") || "1", 10)
  const limit = Number.parseInt(searchParams.get("limit") || "10", 10)
  const cursor = searchParams.get("cursor")

  const validPage = page > 0 ? page : 1
  const validLimit = limit > 0 && limit <= 100 ? limit : 10

  try {
    const whereClause: any = {}

    if (!["ADMIN", "HRD", "SUPERVISOR", "LEADER"].includes(session.user.role)) {
      const employee = await prisma.employee.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      })

      if (!employee) {
        return NextResponse.json({ data: [], pagination: null })
      }

      whereClause.employeeId = employee.id
    }

    if (role === "SUPERVISOR") {
      whereClause.type = "overtime"
    }

    if (typeof status === "string" && status.toLowerCase() !== "all") {
  whereClause.status = status.toUpperCase()
}

    if (type && type !== "all") {
      whereClause.type = type
    }

    if (selectedMonth) {
      const startDate = new Date(selectedMonth.year, selectedMonth.month, 1)
      const endDate = new Date(selectedMonth.year, selectedMonth.month + 1, 0)
      whereClause.createdAt = {
        gte: startDate,
        lte: endDate,
      }
    } else if (timeFilter && timeFilter !== "all") {
      const { start, end } = getTimeFilterDates(timeFilter)
      whereClause.createdAt = {
        gte: start,
        lte: end,
      }
    } else {
      const startDate = searchParams.get("startDate")
      const endDate = searchParams.get("endDate")

      if (startDate && endDate) {
        whereClause.createdAt = {
          gte: new Date(startDate),
          lte: new Date(endDate),
        }
      }
    }

    const department = searchParams.get("department")
    if (department && department !== "all") {
      whereClause.employee = {
        department: department,
      }
    }

    const cacheKey = generateCacheKey(searchParams, session.user.id, role || "UNKNOWN")

    if (format) {
      const forms = await prisma.form.findMany({
        where: whereClause,
        select: {
          id: true,
          type: true,
          status: true,
          data: true,
          createdAt: true,
          formNumber: true,
          employee: {
            select: {
              id: true,
              name: true,
              employeeCode: true,
              department: true,
              position: true,
            },
          },
          approvals: {
            select: {
              id: true,
              role: true,
              status: true,
              approver: {
                select: {
                  id: true,
                  name: true,
                  role: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5000,
      })

      return handleExport(forms, format, selectedMonth)
    }

    const cacheEntry = formCache.get(cacheKey)
    if (cacheEntry) {
      console.log(`✅ Cache hit for key: ${cacheKey}`)
      return NextResponse.json(cacheEntry)
    }

    console.log(`🚫 Cache miss for key: ${cacheKey}`)

    const baseSelect = {
      id: true,
      formNumber: true,
      type: true,
      status: true,
      data: true,
      createdAt: true,
      updatedAt: true,
      employeeId: true,
      employee: {
        select: {
          id: true,
          name: true,
          employeeCode: true,
          department: true,
          position: true,
        },
      },
    }

    const includeApprovals = Boolean(searchParams.get("includeApprovals"))
    const selectClause = {
      ...baseSelect,
      ...(includeApprovals && {
        approvals: {
          select: {
            id: true,
            role: true,
            status: true,
            approver: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        },
      }),
    }

    let paginationOptions: any = {
      orderBy: {
        createdAt: "desc",
      },
    }

    if (getAllForms) {
      paginationOptions.take = 1000
    } else if (cursor) {
      paginationOptions = {
        ...paginationOptions,
        cursor: {
          id: cursor,
        },
        skip: 1,
        take: validLimit,
      }
    } else {
      const skip = (validPage - 1) * validLimit
      paginationOptions = {
        ...paginationOptions,
        skip: skip,
        take: validLimit,
      }
    }

    let totalCount = 0
    if (!getAllForms) {
      const countCacheKey = `count:${cacheKey}`
      const cachedCount = countCache.get(countCacheKey)

      if (cachedCount !== null) {
        totalCount = cachedCount
      } else {
        if (Object.keys(whereClause).length === 0) {
          try {
            const result = await prisma.$queryRaw<{ estimated_count: number }[]>`
              SELECT reltuples::bigint AS estimated_count
              FROM pg_class
              WHERE relname = 'Form'
            `
            totalCount = Number(result[0]?.estimated_count) || 0
          } catch {
            totalCount = await prisma.form.count({ where: whereClause })
          }
        } else {
          totalCount = await prisma.form.count({ where: whereClause })
        }

        countCache.set(countCacheKey, totalCount)
      }
    }

    const forms = await prisma.form.findMany({
      where: whereClause,
      select: selectClause,
      ...paginationOptions,
    })

    if (isStatsRequest) {
      formCache.set(cacheKey, forms)
      return NextResponse.json(forms)
    }

    if (!getAllForms) {
      const totalPages = Math.ceil(totalCount / validLimit)
      const lastForm = forms[forms.length - 1]

      const responseData = {
        data: forms,
        pagination: {
          total: totalCount,
          page: validPage,
          limit: validLimit,
          totalPages: totalPages,
          hasNextPage: validPage < totalPages,
          hasPrevPage: validPage > 1,
          nextCursor: lastForm?.id || null,
        },
      }

      formCache.set(cacheKey, responseData)

      const endTime = Date.now()
      console.log(`✅ Request processed in ${endTime - startTime}ms`)

      return NextResponse.json(responseData)
    }

    formCache.set(cacheKey, forms)

    const endTime = Date.now()
    console.log(`✅ Request processed in ${endTime - startTime}ms`)

    return NextResponse.json(forms)
  } catch (error) {
    console.error("❌ Error fetching forms:", error)
    return NextResponse.json({ error: "Failed to fetch forms" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const session = (await getServerSession(authOptions)) as CustomSession | null

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (session.user.role !== "ADMIN" && session.user.role !== "HRD") {
    return NextResponse.json({ error: "Insufficient permissions to delete forms" }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const formId = searchParams.get("id")

    if (!formId) {
      return NextResponse.json({ error: "Form ID is required" }, { status: 400 })
    }

    const existingForm = await prisma.form.findUnique({
      where: { id: formId },
      select: {
        id: true,
        employeeId: true,
        status: true,
        type: true,
        formNumber: true,
        employee: {
          select: {
            name: true,
          },
        },
      },
    })

    if (!existingForm) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.approval.deleteMany({
        where: { formId: formId },
      })

      await tx.form.delete({
        where: { id: formId },
      })
    })

    formCache.clear()
    countCache.clear()

    console.log(
      `✅ Form ${formId} (Form #${existingForm.formNumber}) deleted successfully by user ${session.user.id} (${session.user.name})`,
    )

    return NextResponse.json({
      success: true,
      message: "Form deleted successfully",
      deletedForm: {
        id: formId,
        formNumber: existingForm.formNumber,
        type: existingForm.type,
        status: existingForm.status,
      },
    })
  } catch (error) {
    console.error("❌ Error deleting form:", error)

    if (error instanceof Error && "code" in (error as any)) {
      const prismaError = error as any
      if (prismaError.code === "P2025") {
        return NextResponse.json({ error: "Form not found or already deleted" }, { status: 404 })
      }
      if (prismaError.code === "P2003") {
        return NextResponse.json(
          {
            error: "Cannot delete form due to related data constraints",
          },
          { status: 409 },
        )
      }
    }

    return NextResponse.json(
      {
        error: "Failed to delete form. Please try again later.",
      },
      { status: 500 },
    )
  }
}

// Helper functions
function getTimeFilterDates(filter: string) {
  const now = new Date()
  let start: Date
  let end: Date = endOfDay(now)

  switch (filter) {
    case "week":
      start = startOfWeek(now, { weekStartsOn: 1 })
      end = endOfWeek(now, { weekStartsOn: 1 })
      break
    case "month":
      start = startOfMonth(now)
      end = endOfMonth(now)
      break
    case "year":
      start = startOfYear(now)
      end = endOfYear(now)
      break
    default:
      start = now
      end = now
  }

  return { start, end }
}

function getEmployeeInfoFromForm(form: any) {
  // Always prioritize form.employee from database relation (includes proper employeeCode)
  if (form.employee && form.employee.id) {
    return {
      name: form.employee.name || "",
      employeeCode: form.employee.employeeCode || "",
      department: form.employee.department || "",
      position: form.employee.position || "",
    }
  }

  // Fallback to form.data fields if employee relation is not available
  if (form.data) {
    const employeeData = {
      name: form.data.employeeName || form.data.name || "",
      employeeCode: form.data.employeeCode || "",
      department: form.data.department || "",
      position: form.data.position || "",
    }

    if (employeeData.name || employeeData.employeeCode || employeeData.department || employeeData.position) {
      return employeeData
    }
  }

  return { name: "", employeeCode: "", department: "", position: "" }
}

async function handleExport(forms: any[], format: string, selectedMonth: { month: number; year: number } | null) {
  try {
    if (!Array.isArray(forms) || forms.length === 0) {
      const whereClause: any = {}

      if (selectedMonth) {
        const startDate = new Date(selectedMonth.year, selectedMonth.month, 1)
        const endDate = new Date(selectedMonth.year, selectedMonth.month + 1, 0)
        whereClause.createdAt = {
          gte: startDate,
          lte: endDate,
        }
      }

      forms = await prisma.form.findMany({
        where: whereClause,
        select: {
          id: true,
          type: true,
          status: true,
          data: true,
          createdAt: true,
          formNumber: true,
          employee: {
            select: {
              id: true,
              name: true,
              employeeCode: true,
              department: true,
              position: true,
            },
          },
          approvals: {
            select: {
              id: true,
              role: true,
              status: true,
              approver: {
                select: {
                  id: true,
                  name: true,
                  role: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5000,
      })
    }

    // Pre-fetch all employees for efficient lookup
    const allEmployees = await prisma.employee.findMany({
      select: {
        id: true,
        name: true,
        employeeCode: true,
        department: true,
        position: true,
      },
    })

    if (format === "excel") {
      const data: any[] = []

      forms.forEach((form) => {
        // Special handling for overtime: use employees from form.data.employees array, not form.employee
        if (form.type === "overtime" && form.data && form.data.employees && Array.isArray(form.data.employees) && form.data.employees.length > 0) {
          // For overtime, iterate through each employee in the form
          form.data.employees.forEach((selectedEmployee: any) => {
            // Lookup employee code from pre-fetched employees by name (case-insensitive partial match)
            const dbEmployee = allEmployees.find(emp => 
              emp.name.toLowerCase().includes(selectedEmployee.name.toLowerCase()) ||
              selectedEmployee.name.toLowerCase().includes(emp.name.toLowerCase())
            )
            
            const employee = dbEmployee || selectedEmployee
            
            const details = {
              Date: form.data.date ? new Date(form.data.date).toLocaleDateString() : "N/A",
              Hours: form.data.hours || "N/A",
            }

            data.push({
              "Request Type": "Overtime",
              "Employee Name": employee.name || selectedEmployee.name || "",
              "Employee Code": dbEmployee?.employeeCode || "",
              Department: employee.department || selectedEmployee.department || "",
              Position: employee.position || selectedEmployee.position || "",
              Status: form.status.charAt(0).toUpperCase() + form.status.slice(1),
              "Submission Date": new Date(form.createdAt).toLocaleDateString(),
              ...details,
              Reason: form.data?.reason || "N/A",
            })
          })
        } else if (form.employee && form.employee.id) {
          // Use employee from database relation (works for all form types except overtime)
          const employee = form.employee
          let details = {}
          if (form.type === "leave" && form.data) {
              const isManualDates =
                form.data.dateSelectionMode === "manual" && form.data.manualDates && form.data.manualDates.length > 0

              if (isManualDates) {
                const sortedDates = [...form.data.manualDates].sort(
                  (a: string, b: string) => new Date(a).getTime() - new Date(b).getTime(),
                )
                details = {
                  "Leave Type": form.data.leaveType || "N/A",
                  "Date Selection": "Non-consecutive",
                  "Selected Dates": sortedDates.map((d: string) => new Date(d).toLocaleDateString()).join(", "),
                  "Start Date": sortedDates[0] ? new Date(sortedDates[0]).toLocaleDateString() : "N/A",
                  "End Date": sortedDates[sortedDates.length - 1]
                    ? new Date(sortedDates[sortedDates.length - 1]).toLocaleDateString()
                    : "N/A",
                  "Total Days": form.data.totalDays || "N/A",
                  "Half Day": form.data.isHalfDay ? "Yes" : "No",
                  "Early Leave": form.data.isEarlyLeave ? "Yes" : "No",
                }
              } else {
                details = {
                  "Leave Type": form.data.leaveType || "N/A",
                  "Date Selection": "Consecutive",
                  "Selected Dates": "N/A",
                  "Start Date": form.data.startDate ? new Date(form.data.startDate).toLocaleDateString() : "N/A",
                  "End Date": form.data.endDate ? new Date(form.data.endDate).toLocaleDateString() : "N/A",
                  "Total Days": form.data.totalDays || "N/A",
                  "Half Day": form.data.isHalfDay ? "Yes" : "No",
                  "Early Leave": form.data.isEarlyLeave ? "Yes" : "No",
                }
              }
            } else if (form.type === "overtime" && form.data) {
              details = {
                Date: form.data.date ? new Date(form.data.date).toLocaleDateString() : "N/A",
                Hours: form.data.hours || "N/A",
              }
            } else if (form.type === "training-request" && form.data) {
              details = {
                "Training Title": form.data.trainingTitle || "N/A",
                "Training Provider": form.data.trainingProvider || "N/A",
                "Start Date": form.data.startDate ? new Date(form.data.startDate).toLocaleDateString() : "N/A",
                "End Date": form.data.endDate ? new Date(form.data.endDate).toLocaleDateString() : "N/A",
              }
            } else if (form.type === "job-requisition" && form.data) {
              details = {
                "Request Position": form.data.jobRequisition?.requestPosition || "N/A",
                "Department Name": form.data.jobRequisition?.departmentName || "N/A",
                "Expected Start Date": form.data.jobRequisition?.expectedStartDate
                  ? new Date(form.data.jobRequisition.expectedStartDate).toLocaleDateString()
                  : "N/A",
              }
            } else if (form.data) {
              details = {
                Details: form.data.details || "N/A",
              }
            }

          data.push({
            "Request Type": form.type.charAt(0).toUpperCase() + form.type.slice(1),
            "Employee Name": employee.name || "",
            "Employee Code": employee.employeeCode || "",
            Department: employee.department || "",
            Position: employee.position || "",
            Status: form.status.charAt(0).toUpperCase() + form.status.slice(1),
            "Submission Date": new Date(form.createdAt).toLocaleDateString(),
            ...details,
            Reason: form.data?.reason || "N/A",
          })
        } else {
          const employeeInfo = getEmployeeInfoFromForm(form)

          let details = {}
          if (form.type === "leave" && form.data) {
            const isManualDates =
              form.data.dateSelectionMode === "manual" && form.data.manualDates && form.data.manualDates.length > 0

            if (isManualDates) {
              const sortedDates = [...form.data.manualDates].sort(
                (a: string, b: string) => new Date(a).getTime() - new Date(b).getTime(),
              )
              details = {
                "Leave Type": form.data.leaveType || "N/A",
                "Date Selection": "Non-consecutive",
                "Selected Dates": sortedDates.map((d: string) => new Date(d).toLocaleDateString()).join(", "),
                "Start Date": sortedDates[0] ? new Date(sortedDates[0]).toLocaleDateString() : "N/A",
                "End Date": sortedDates[sortedDates.length - 1]
                  ? new Date(sortedDates[sortedDates.length - 1]).toLocaleDateString()
                  : "N/A",
                "Total Days": form.data.totalDays || "N/A",
                "Half Day": form.data.isHalfDay ? "Yes" : "No",
                "Early Leave": form.data.isEarlyLeave ? "Yes" : "No",
              }
            } else {
              details = {
                "Leave Type": form.data.leaveType || "N/A",
                "Date Selection": "Consecutive",
                "Selected Dates": "N/A",
                "Start Date": form.data.startDate ? new Date(form.data.startDate).toLocaleDateString() : "N/A",
                "End Date": form.data.endDate ? new Date(form.data.endDate).toLocaleDateString() : "N/A",
                "Total Days": form.data.totalDays || "N/A",
                "Half Day": form.data.isHalfDay ? "Yes" : "No",
                "Early Leave": form.data.isEarlyLeave ? "Yes" : "No",
              }
            }
          } else if (form.type === "overtime" && form.data) {
            details = {
              Date: form.data.date ? new Date(form.data.date).toLocaleDateString() : "N/A",
              Hours: form.data.hours || "N/A",
            }
          } else if (form.type === "training-request" && form.data) {
            details = {
              "Training Title": form.data.trainingTitle || "N/A",
              "Training Provider": form.data.trainingProvider || "N/A",
              "Start Date": form.data.startDate ? new Date(form.data.startDate).toLocaleDateString() : "N/A",
              "End Date": form.data.endDate ? new Date(form.data.endDate).toLocaleDateString() : "N/A",
            }
          } else if (form.type === "job-requisition" && form.data) {
            details = {
              "Request Position": form.data.jobRequisition?.requestPosition || "N/A",
              "Department Name": form.data.jobRequisition?.departmentName || "N/A",
              "Expected Start Date": form.data.jobRequisition?.expectedStartDate
                ? new Date(form.data.jobRequisition.expectedStartDate).toLocaleDateString()
                : "N/A",
            }
          } else if (form.data) {
            details = {
              Details: form.data.details || "N/A",
            }
          }

          data.push({
            "Request Type": form.type.charAt(0).toUpperCase() + form.type.slice(1),
            "Employee Name": employeeInfo.name,
            "Employee Code": employeeInfo.employeeCode || "",
            Department: employeeInfo.department,
            Position: employeeInfo.position,
            Status: form.status.charAt(0).toUpperCase() + form.status.slice(1),
            "Submission Date": new Date(form.createdAt).toLocaleDateString(),
            ...details,
            Reason: form.data?.reason || "N/A",
          })
        }
      })

      const ws = XLSX.utils.json_to_sheet(data)

      const colWidths = [
        { wch: 15 },
        { wch: 25 },
        { wch: 15 },
        { wch: 20 },
        { wch: 20 },
        { wch: 12 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 40 },
        { wch: 15 },
        { wch: 15 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
        { wch: 40 },
      ]
      ws["!cols"] = colWidths

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "HR Forms")

      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" })

      const dateStr = new Date().toISOString().split("T")[0]
      let filename = `HR-Forms-Report-${dateStr}`

      if (selectedMonth) {
        const monthName = new Date(selectedMonth.year, selectedMonth.month).toLocaleString("default", { month: "long" })
        filename = `HR-Forms-Report-${monthName}-${selectedMonth.year}-${dateStr}`
      }

      return new Response(excelBuffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
        },
      })
    } else if (format === "pdf") {
      const doc = new jsPDF()

      doc.setFillColor(0, 150, 136)
      doc.rect(0, 0, 210, 20, "F")
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(16)
      doc.setFont("helvetica", "bold")
      doc.text("PT HANG TONG MANUFACTORY", 105, 12, { align: "center" })

      doc.setTextColor(0, 0, 0)
      doc.setFontSize(14)
      doc.text("HR Forms Report", 14, 30)

      if (selectedMonth) {
        const startDate = new Date(selectedMonth.year, selectedMonth.month, 1)
        const endDate = new Date(selectedMonth.year, selectedMonth.month + 1, 0)
        doc.setFontSize(10)
        doc.text(`Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`, 14, 38)
      }

      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 44)

      doc.setFillColor(240, 240, 240)
      doc.rect(14, 50, 182, 8, "F")
      doc.setFont("helvetica", "bold")
      doc.setFontSize(9)
      doc.setTextColor(60, 60, 60)
      doc.text("Type", 16, 56)
      doc.text("Employee", 45, 56)
      doc.text("Department", 85, 56)
      doc.text("Details", 125, 56)
      doc.text("Status", 165, 56)
      doc.text("Date", 185, 56)

      let y = 64
      doc.setFont("helvetica", "normal")
      doc.setTextColor(0, 0, 0)

      let rowIndex = 0
      forms.forEach((form) => {
        const employeeInfo = getEmployeeInfoFromForm(form)

        if (rowIndex % 2 === 0) {
          doc.setFillColor(248, 248, 248)
          doc.rect(14, y - 4, 182, 10, "F")
        }

        doc.text(form.type.charAt(0).toUpperCase() + form.type.slice(1), 16, y)
        doc.text(employeeInfo.name.substring(0, 20), 45, y)
        doc.text(employeeInfo.department.substring(0, 15), 85, y)

        let details = "N/A"
        if (form.type === "leave" && form.data) {
          const isManualDates =
            form.data.dateSelectionMode === "manual" && form.data.manualDates && form.data.manualDates.length > 0
          if (isManualDates) {
            details = `${form.data.leaveType || "N/A"}, ${form.data.manualDates.length} dates`
          } else {
            details = `${form.data.leaveType || "N/A"}, ${form.data.totalDays || "N/A"} days`
          }
        } else if (form.type === "overtime" && form.data) {
          details = `${form.data.hours || "N/A"} hours`
        }
        doc.text(details.substring(0, 20), 125, y)

        doc.text(form.status.charAt(0).toUpperCase() + form.status.slice(1), 165, y)
        doc.text(new Date(form.createdAt).toLocaleDateString(), 185, y)

        y += 10
        rowIndex++

        if (y > 280) {
          doc.addPage()
          y = 30
        }
      })

      const pdfBuffer = doc.output("arraybuffer")

      const dateStr = new Date().toISOString().split("T")[0]
      let filename = `HR-Forms-Report-${dateStr}`

      if (selectedMonth) {
        const monthName = new Date(selectedMonth.year, selectedMonth.month).toLocaleString("default", { month: "long" })
        filename = `HR-Forms-Report-${monthName}-${selectedMonth.year}-${dateStr}`
      }

      return new Response(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}.pdf"`,
        },
      })
    }

    return NextResponse.json({ error: "Unsupported export format" }, { status: 400 })
  } catch (error) {
    console.error("❌ Error exporting forms:", error)
    return NextResponse.json({ error: "Failed to export forms" }, { status: 500 })
  }
}

function mapTrainingMode(mode: string) {
  const modeMap: { [key: string]: any } = {
    inPerson: "IN_PERSON",
    online: "ONLINE",
    hybrid: "HYBRID",
    IN_PERSON: "IN_PERSON",
    ONLINE: "ONLINE",
    HYBRID: "HYBRID",
  }
  return modeMap[mode] || "IN_PERSON"
}

function mapEmployeeCategory(category: string) {
  const categoryMap: { [key: string]: any } = {
    staff: "STAFF",
    manager: "MANAGER",
    director: "DIRECTOR",
    STAFF: "STAFF",
    MANAGER: "MANAGER",
    DIRECTOR: "DIRECTOR",
  }
  return categoryMap[category] || "STAFF"
}
