import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import * as XLSX from "xlsx"
import { jsPDF } from "jspdf"
import { endOfDay, startOfWeek, startOfMonth, startOfYear, endOfWeek, endOfMonth, endOfYear } from "date-fns"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendMail } from "@/lib/mail"

// Define a type for the session user to include the properties you're using
interface SessionUser {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
  role: string
}

// Extend the Session type to use our custom user type
interface CustomSession {
  user: SessionUser
}

interface LeaveBalance {
  daysRequested: number
  remainingAfter: number
}

interface LeaveFormData {
  employees: { name: string; position: string; employeeId: string; department: string }[]
  leaveType: string
  startDate: string
  endDate: string
  totalDays: string
  reason: string
  supportingDocuments: string[]
  leaveBalance?: LeaveBalance
}

interface FormSubmissionData {
  type: string
  formData: LeaveFormData
  signature: string
  supportingDocuments: string[]
  jumlahHariCuti: number
}

// Cache configuration
const CACHE_TTL = 60 * 1000 // 1 minute cache TTL
const formCache = new Map()
const countCache = new Map()

// Cache key generator
function generateCacheKey(params: URLSearchParams): string {
  return Array.from(params.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, value]) => `${key}=${value}`)
    .join("&")
}

/**
 * Function to send email notification when a new form is submitted
 * Made non-blocking by not awaiting the result
 */
function sendNewFormNotification(form: any, user: SessionUser) {
  return new Promise<boolean>(async (resolve) => {
    try {
      const formType = form.type === "leave" ? "Leave Request" : "Overtime Request"
      const formNumber = form.formNumber ? form.formNumber.toString().padStart(4, "0") : form.id

      const subject = `New ${formType} Form #${formNumber} Submitted`

      // Format dates for email
      const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString()
      }

      // Create HTML content for email
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0f766e;">New ${formType} Form Submitted</h2>
          <p>A new ${formType.toLowerCase()} form has been submitted and requires your attention.</p>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 5px; padding: 15px; margin: 15px 0;">
            <h3 style="margin-top: 0;">Form Details:</h3>
            <p><strong>Form Type:</strong> ${formType}</p>
            <p><strong>Form ID:</strong> ${formNumber}</p>
            <p><strong>Submitted By:</strong> ${user.name || "Employee"} (${user.email || "No email"})</p>
            <p><strong>Submitted On:</strong> ${formatDate(new Date().toISOString())}</p>
            ${
              form.type === "leave"
                ? `<p><strong>Leave Type:</strong> ${form.data.leaveType}</p>
                  <p><strong>Date Range:</strong> ${formatDate(form.data.startDate)} - ${formatDate(form.data.endDate)}</p>
                  <p><strong>Total Days:</strong> ${form.data.totalDays}</p>`
                : `<p><strong>Date:</strong> ${formatDate(form.data.date)}</p>
                  <p><strong>Time Range:</strong> ${form.data.startTime} - ${form.data.endTime}</p>`
            }
            <p><strong>Reason:</strong> ${form.data.reason}</p>
          </div>
          
          <p>Please log in to the system to review and process this request.</p>
          <p>This is an automated notification. Please do not reply to this email.</p>
        </div>
      `

      // Determine recipients based on form type
      const recipients = []

      // All forms need HRD approval
      recipients.push(process.env.HRD_EMAIL || "hrd@example.com")

      // Only overtime forms need PMC approval
      if (form.type === "overtime") {
        recipients.push(process.env.PMC_EMAIL || "pmc@example.com")
      }

      // If the user is not a leader, notify leaders
      if (user.role !== "leader") {
        // In a real implementation, you would fetch leader emails from the database
        // For now, we'll just use HRD as a fallback
        // recipients.push("leader@example.com")
      }

      // Remove duplicates
      const uniqueRecipients = [...new Set(recipients)]

      // Use Promise.all to send emails in parallel instead of sequentially
      const emailPromises = uniqueRecipients.map((recipient) =>
        sendMail({
          to: recipient,
          subject,
          html: htmlContent,
        }),
      )

      await Promise.all(emailPromises)

      console.log(`New form notification emails sent to ${uniqueRecipients.join(", ")}`)
      resolve(true)
    } catch (error) {
      console.error("Error sending new form notification emails:", error)
      resolve(false)
    }
  })
}

/**
 * Fungsi untuk mendapatkan nomor form berikutnya secara berurutan
 * Memastikan nomor form melanjutkan dari nomor terakhir yang ada di database
 */
async function getNextFormNumber(tx: any) {
  try {
    // Cari form dengan nomor tertinggi menggunakan query yang lebih robust
    // Menggunakan raw SQL untuk memastikan kita mendapatkan nilai numerik yang benar
    const highestFormResult = await tx.$queryRaw<{ max_form_number: number | null }[]>`
      SELECT COALESCE(MAX("formNumber"), 0) as max_form_number FROM "Form"
    `

    // Pastikan kita mendapatkan nilai yang valid
    let maxFormNumber = highestFormResult[0]?.max_form_number

    // Jika null atau undefined, gunakan 0
    if (maxFormNumber === null || maxFormNumber === undefined) {
      maxFormNumber = 0
    }

    // Pastikan maxFormNumber adalah angka
    maxFormNumber = Number(maxFormNumber)

    // Jika bukan angka yang valid, gunakan 0
    if (isNaN(maxFormNumber)) {
      maxFormNumber = 0
    }

    // Tambahkan 1 untuk mendapatkan nomor berikutnya
    const nextFormNumber = maxFormNumber + 1

    console.log(`Next form number: ${nextFormNumber} (based on max: ${maxFormNumber})`)

    return nextFormNumber
  } catch (error) {
    console.error("Error getting next form number:", error)
    throw new Error("Failed to generate form number")
  }
}

/**
 * Fungsi untuk memverifikasi bahwa nomor form belum digunakan
 */
async function verifyFormNumberUnique(tx: any, formNumber: number): Promise<boolean> {
  const existingForm = await tx.form.findFirst({
    where: { formNumber },
    select: { id: true },
  })

  return existingForm === null
}

// Update the POST function to ensure it always returns a valid JSON response
export async function POST(request: Request) {
  const session = (await getServerSession(authOptions)) as CustomSession | null

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const data = await request.json()

    // Parse the total days as a number for leave forms
    let jumlahHari = 0
    if (data.type === "leave") {
      jumlahHari = data.jumlahHariCuti || Number.parseInt(data.formData.totalDays) || 0

      // Add jumlahHari to the form data for easier access later
      data.formData.jumlahHari = jumlahHari
    }

    // Implementasi retry logic untuk menangani race condition
    let retries = 0
    const maxRetries = 3
    let lastError: Error | null = null
    let createdForm: any = null

    while (retries < maxRetries) {
      try {
        // Use a transaction to handle form creation and avoid race conditions with formNumber
        const result = await prisma.$transaction(
          async (tx) => {
            // Dapatkan nomor form berikutnya
            let nextFormNumber = await getNextFormNumber(tx)

            // Verifikasi bahwa nomor form belum digunakan
            let isUnique = await verifyFormNumberUnique(tx, nextFormNumber)

            // Jika nomor sudah digunakan, cari nomor berikutnya yang tersedia
            while (!isUnique) {
              console.log(`Form number ${nextFormNumber} already exists, trying next number`)
              nextFormNumber++
              isUnique = await verifyFormNumberUnique(tx, nextFormNumber)
            }

            console.log(`Using form number: ${nextFormNumber}`)

            // Make sure the userId is included in the form data
            if (data.type === "leave" && data.formData) {
              data.formData.userId = session.user.id
            }

            // Create approvals array based on form type and user role
            const approvals = []

            if (session.user.role === "leader") {
              // Leaders auto-approve their own forms
              approvals.push({
                role: "leader",
                status: "approved",
                approverId: session.user.id,
                signature: data.signature,
              })
            } else {
              // Regular employees need leader approval
              approvals.push({
                role: "leader",
                status: "pending",
              })
            }

            // All forms need HRD approval
            approvals.push({
              role: "hrd",
              status: "pending",
            })

            // Only add PMC approval for overtime forms
            if (data.type === "overtime") {
              approvals.push({
                role: "pmc",
                status: "pending",
              })
            }

            // Create the form with transaction
            const form = await tx.form.create({
              data: {
                formNumber: nextFormNumber,
                type: data.type,
                status: "pending",
                data: data.formData,
                employeeId: session.user.id,
                employeeSignature: data.signature,
                supportingDocuments: data.supportingDocuments || [],
                approvals: {
                  create: approvals,
                },
              },
            })

            // Invalidate cache after creating a new form
            formCache.clear()
            countCache.clear()

            return { form }
          },
          {
            timeout: 10000,
            isolationLevel: "Serializable", // Use serializable isolation level to prevent race conditions
          },
        )

        // Store the created form for email notification
        createdForm = result.form

        // Jika berhasil, kembalikan respons sukses
        return NextResponse.json({
          success: true,
          formId: result.form.id,
          formNumber: result.form.formNumber,
        })
      } catch (error) {
        console.log(`Attempt ${retries + 1} failed:`, error)
        lastError = error instanceof Error ? error : new Error(String(error))

        // Cek apakah error adalah P2002 (unique constraint violation)
        const isPrismaUniqueConstraintError =
          error instanceof Error && "code" in (error as any) && (error as any).code === "P2002"

        if (isPrismaUniqueConstraintError) {
          retries++

          if (retries >= maxRetries) {
            console.log(`Max retries (${maxRetries}) reached. Giving up.`)
            break
          }

          // Tunggu sebentar sebelum mencoba lagi (exponential backoff)
          const delay = 100 * Math.pow(2, retries)
          console.log(`Waiting ${delay}ms before retry ${retries + 1}...`)
          await new Promise((resolve) => setTimeout(resolve, delay))
        } else {
          // Jika bukan error unique constraint, lempar error langsung
          throw error
        }
      }
    }

    // Send email notification after successful form creation
    // Make it non-blocking by not awaiting the result
    if (createdForm) {
      // Fire and forget - don't await
      sendNewFormNotification(createdForm, session.user)
        .then(() => console.log("New form notification sent successfully"))
        .catch((err) => console.error("Failed to send new form notification:", err))
    }

    // Jika semua retry gagal
    if (lastError) {
      throw lastError
    }

    throw new Error("Failed to create form after multiple attempts")
  } catch (error) {
    console.error("Error creating form:", error)
    // Ensure we return a proper error object with a message
    const errorMessage = error instanceof Error ? error.message : "Failed to create form"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

// Update the GET function to handle the export requests properly
export async function GET(request: Request) {
  const startTime = Date.now()
  const session = (await getServerSession(authOptions)) as CustomSession | null

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

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

  // Ensure valid pagination values
  const validPage = page > 0 ? page : 1
  const validLimit = limit > 0 && limit <= 100 ? limit : 10
  const skip = (validPage - 1) * validLimit

  try {
    const whereClause: any = {}

    // Filter by user role
    if (session.user.role !== "admin" && session.user.role !== "hrd" && session.user.role !== "pmc") {
      whereClause.employeeId = session.user.id
    }

    // For PMC users, only show overtime forms
    if (session.user.role === "pmc") {
      whereClause.type = "overtime"
    }

    // Filter by status if provided
    if (status) {
      whereClause.status = status
    }

    // Filter by type if provided
    if (type && type !== "all") {
      whereClause.type = type
    }

    // Add date range filtering
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

    // Add department filtering
    const department = searchParams.get("department")
    if (department && department !== "all") {
      whereClause.employee = {
        department: department,
      }
    }

    // Generate cache key based on query parameters
    const cacheKey = generateCacheKey(searchParams)

    // For export requests, always fetch all data without pagination
    if (format) {
      // Fetch all forms that match the criteria without pagination
      const forms = await prisma.form.findMany({
        where: whereClause,
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              employeeId: true,
              department: true,
              position: true,
            },
          },
          approvals: {
            include: {
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
      })

      return handleExport(forms, format, selectedMonth)
    }

    // Check if we have cached data
    const cacheEntry = formCache.get(cacheKey)
    if (cacheEntry && Date.now() - cacheEntry.timestamp < CACHE_TTL) {
      console.log(`Cache hit for key: ${cacheKey}, age: ${Date.now() - cacheEntry.timestamp}ms`)

      // If format is specified, handle export with cached data
      if (format) {
        return handleExport(cacheEntry.data, format, selectedMonth)
      }

      // For stats endpoint, return cached data
      if (isStatsRequest) {
        return NextResponse.json(cacheEntry.data)
      }

      // Return cached paginated data
      return NextResponse.json(cacheEntry.data)
    }

    console.log(`Cache miss for key: ${cacheKey}`)

    // Optimize the include statement based on what's needed
    const includeClause = {
      employee: {
        select: {
          id: true,
          name: true,
          employeeId: true,
          department: true,
          position: true,
        },
      },
      // Only include approvals if needed (not for basic listing)
      ...(isStatsRequest || format || getAllForms
        ? {
            approvals: {
              include: {
                approver: {
                  select: {
                    id: true,
                    name: true,
                    role: true,
                  },
                },
              },
            },
          }
        : {}),
    }

    // Check if we have a cached count for this query
    const countCacheKey = `count:${JSON.stringify(whereClause)}`
    let totalCount
    const countCacheEntry = countCache.get(countCacheKey)

    // Use transaction to combine multiple database operations
    const result = await prisma.$transaction(async (tx) => {
      // Get count if needed and not cached
      let count = 0
      if (!getAllForms && (!countCacheEntry || Date.now() - countCacheEntry.timestamp >= CACHE_TTL)) {
        count = await tx.form.count({
          where: whereClause,
        })

        // Cache the count
        countCache.set(countCacheKey, {
          count,
          timestamp: Date.now(),
        })
      } else if (!getAllForms) {
        count = countCacheEntry.count
      }

      // Fetch forms based on the query parameters with optimized select
      const forms = await tx.form.findMany({
        where: whereClause,
        include: includeClause,
        orderBy: {
          createdAt: "desc",
        },
        ...(getAllForms ? {} : { skip, take: validLimit }),
      })

      return { forms, count }
    })

    const { forms, count } = result
    totalCount = count

    // If format is specified, handle export
    if (format) {
      // Cache the raw forms data
      formCache.set(cacheKey, {
        data: forms,
        timestamp: Date.now(),
      })
      return handleExport(forms, format, selectedMonth)
    }

    // For stats endpoint, return all forms
    if (isStatsRequest) {
      // Cache the data
      formCache.set(cacheKey, {
        data: forms,
        timestamp: Date.now(),
      })
      return NextResponse.json(forms)
    }

    // Otherwise, return paginated data
    if (!getAllForms) {
      // Calculate pagination metadata
      const totalPages = Math.ceil(totalCount / validLimit)

      const responseData = {
        data: forms,
        pagination: {
          total: totalCount,
          page: validPage,
          limit: validLimit,
          totalPages: totalPages,
          hasNextPage: validPage < totalPages,
          hasPrevPage: validPage > 1,
        },
      }

      // Cache the response
      formCache.set(cacheKey, {
        data: responseData,
        timestamp: Date.now(),
      })

      const endTime = Date.now()
      console.log(`Request processed in ${endTime - startTime}ms`)

      return NextResponse.json(responseData)
    }

    // Return all forms for statistics
    formCache.set(cacheKey, {
      data: forms,
      timestamp: Date.now(),
    })

    const endTime = Date.now()
    console.log(`Request processed in ${endTime - startTime}ms`)

    return NextResponse.json(forms)
  } catch (error) {
    console.error("Error fetching forms:", error)
    return NextResponse.json({ error: "Failed to fetch forms" }, { status: 500 })
  }
}

// DELETE function to handle form deletion
export async function DELETE(request: Request) {
  const session = (await getServerSession(authOptions)) as CustomSession | null

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Only allow HRD, admin, or the form owner to delete forms
  if (session.user.role !== "admin" && session.user.role !== "hrd") {
    return NextResponse.json({ error: "Insufficient permissions to delete forms" }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const formId = searchParams.get("id")

    if (!formId) {
      return NextResponse.json({ error: "Form ID is required" }, { status: 400 })
    }

    // Check if form exists and get form details for verification
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
            email: true,
          },
        },
      },
    })

    if (!existingForm) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 })
    }

    // Additional permission check: only HRD and admin can delete any form
    // Regular users cannot delete forms (even their own) for audit trail purposes
    if (session.user.role !== "admin" && session.user.role !== "hrd") {
      return NextResponse.json(
        {
          error: "Only HRD and administrators can delete forms",
        },
        { status: 403 },
      )
    }

    // Use transaction to ensure data consistency
    await prisma.$transaction(async (tx) => {
      // Delete related approvals first (cascade delete)
      await tx.approval.deleteMany({
        where: { formId: formId },
      })

      // Delete any related notifications or audit logs if they exist
      // await tx.notification.deleteMany({
      //   where: { formId: formId },
      // })

      // Delete the form
      await tx.form.delete({
        where: { id: formId },
      })
    })

    // Clear cache after deletion to ensure fresh data
    formCache.clear()
    countCache.clear()

    // Log the deletion for audit purposes
    console.log(
      `Form ${formId} (Form #${existingForm.formNumber}) deleted successfully by user ${session.user.id} (${session.user.name})`,
    )
    console.log(
      `Deleted form details: Type: ${existingForm.type}, Status: ${existingForm.status}, Employee: ${existingForm.employee?.name}`,
    )

    // Send notification email about form deletion (optional)
    try {
      if (existingForm.employee?.email) {
        const formType = existingForm.type === "leave" ? "Leave Request" : "Overtime Request"
        const formNumber = existingForm.formNumber ? existingForm.formNumber.toString().padStart(4, "0") : formId

        await sendMail({
          to: existingForm.employee.email,
          subject: `${formType} Form #${formNumber} Has Been Deleted`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc2626;">Form Deletion Notification</h2>
              <p>Dear ${existingForm.employee.name},</p>
              <p>Your ${formType.toLowerCase()} form #${formNumber} has been deleted from the system.</p>
              <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 5px; padding: 15px; margin: 15px 0;">
                <p><strong>Form Type:</strong> ${formType}</p>
                <p><strong>Form Number:</strong> ${formNumber}</p>
                <p><strong>Status at Deletion:</strong> ${existingForm.status.charAt(0).toUpperCase() + existingForm.status.slice(1)}</p>
                <p><strong>Deleted On:</strong> ${new Date().toLocaleDateString()}</p>
                <p><strong>Deleted By:</strong> ${session.user.name} (${session.user.role.toUpperCase()})</p>
              </div>
              <p>If you have any questions about this deletion, please contact the HR department.</p>
              <p>This is an automated notification. Please do not reply to this email.</p>
            </div>
          `,
        })
      }
    } catch (emailError) {
      console.error("Failed to send deletion notification email:", emailError)
      // Don't fail the deletion if email fails
    }

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
    console.error("Error deleting form:", error)

    // Handle specific Prisma errors
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

// Helper function to get date ranges for predefined time filters
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

// Helper function to get employee info from form
function getEmployeeInfoFromForm(form: any) {
  // First check if there's employee information in form.data.employees array
  if (form.data && form.data.employees && form.data.employees.length > 0) {
    return {
      name: form.data.employees[0].name || "",
      employeeId: form.data.employees[0].employeeId || form.data.employees[0].id || "",
      department: form.data.employees[0].department || "",
      position: form.data.employees[0].position || "",
    }
  }

  // Then check if there's employee information in form.data
  if (form.data && form.data.employee) {
    return {
      name: form.data.employee.name || "",
      employeeId: form.data.employee.employeeId || form.data.employee.id || "",
      department: form.data.employee.department || "",
      position: form.data.employee.position || "",
    }
  }

  // Next check if there are direct employee fields in form.data
  if (form.data) {
    const employeeData = {
      name: form.data.employeeName || form.data.name || "",
      employeeId: form.data.employeeId || form.data.id || "",
      department: form.data.department || "",
      position: form.data.position || "",
    }

    // If at least one field is populated, return this data
    if (employeeData.name || employeeData.employeeId || employeeData.department || employeeData.position) {
      return employeeData
    }
  }

  // As a last resort, return the form.employee data or an empty object if it doesn't exist
  return form.employee || { name: "", employeeId: "", department: "", position: "" }
}

// Helper function to filter forms by time range
function filterFormsByTimeRange(
  forms: any[],
  timeFilter: string | null,
  selectedMonth: { month: number; year: number } | null,
) {
  if (!Array.isArray(forms)) return []

  // If month is selected, filter by that month
  if (selectedMonth) {
    return forms.filter((form) => {
      const formDate = new Date(form.createdAt)
      return formDate.getMonth() === selectedMonth.month && formDate.getFullYear() === selectedMonth.year
    })
  }

  // Otherwise use the time filter
  if (!timeFilter || timeFilter === "all") return forms

  const { start, end } = getTimeFilterDates(timeFilter)

  return forms.filter((form) => {
    const formDate = new Date(form.createdAt)
    return formDate >= start && formDate <= end
  })
}

// Helper function to handle exports
async function handleExport(forms: any[], format: string, selectedMonth: { month: number; year: number } | null) {
  try {
    // If forms is empty or not an array, fetch all forms based on filters
    if (!Array.isArray(forms) || forms.length === 0) {
      const whereClause: any = {}

      // Apply date filtering if selectedMonth is provided
      if (selectedMonth) {
        const startDate = new Date(selectedMonth.year, selectedMonth.month, 1)
        const endDate = new Date(selectedMonth.year, selectedMonth.month + 1, 0)
        whereClause.createdAt = {
          gte: startDate,
          lte: endDate,
        }
      }

      // Fetch all forms that match the criteria without pagination
      forms = await prisma.form.findMany({
        where: whereClause,
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              employeeId: true,
              department: true,
              position: true,
            },
          },
          approvals: {
            include: {
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
      })
    }

    if (format === "excel") {
      // Prepare data for Excel - create a row for each employee in each form
      const data: any[] = []

      forms.forEach((form) => {
        // Check if form has multiple employees in form.data.employees
        if (form.data && form.data.employees && Array.isArray(form.data.employees) && form.data.employees.length > 0) {
          // Create a row for each employee
          form.data.employees.forEach((employee: any) => {
            // Get details based on form type
            let details = {}
            if (form.type === "leave" && form.data) {
              details = {
                "Leave Type": form.data.leaveType || "N/A",
                "Start Date": form.data.startDate ? new Date(form.data.startDate).toLocaleDateString() : "N/A",
                "End Date": form.data.endDate ? new Date(form.data.endDate).toLocaleDateString() : "N/A",
                "Total Days": form.data.totalDays || "N/A",
                "Half Day": form.data.isHalfDay ? "Yes" : "No",
                "Early Leave": form.data.isEarlyLeave ? "Yes" : "No",
              }
            } else if (form.data) {
              details = {
                Date: form.data.date ? new Date(form.data.date).toLocaleDateString() : "N/A",
                Hours: form.data.hours || "N/A",
              }
            }

            data.push({
              "Request Type": form.type.charAt(0).toUpperCase() + form.type.slice(1),
              "Employee Name": employee.name || "",
              "Employee ID": employee.employeeId || employee.id || "",
              Department: employee.department || "",
              Position: employee.position || "",
              Status: form.status.charAt(0).toUpperCase() + form.status.slice(1),
              "Submission Date": new Date(form.createdAt).toLocaleDateString(),
              ...details,
              Reason: form.data?.reason || "N/A",
            })
          })
        } else {
          // Fallback to original employee info if no employees array
          const employeeInfo = getEmployeeInfoFromForm(form)

          // Get details based on form type
          let details = {}
          if (form.type === "leave" && form.data) {
            details = {
              "Leave Type": form.data.leaveType || "N/A",
              "Start Date": form.data.startDate ? new Date(form.data.startDate).toLocaleDateString() : "N/A",
              "End Date": form.data.endDate ? new Date(form.data.endDate).toLocaleDateString() : "N/A",
              "Total Days": form.data.totalDays || "N/A",
              "Half Day": form.data.isHalfDay ? "Yes" : "No",
              "Early Leave": form.data.isEarlyLeave ? "Yes" : "No",
            }
          } else if (form.data) {
            details = {
              Date: form.data.date ? new Date(form.data.date).toLocaleDateString() : "N/A",
              Hours: form.data.hours || "N/A",
            }
          }

          data.push({
            "Request Type": form.type.charAt(0).toUpperCase() + form.type.slice(1),
            "Employee Name": employeeInfo.name,
            "Employee ID": employeeInfo.employeeId,
            Department: employeeInfo.department,
            Position: employeeInfo.position,
            Status: form.status.charAt(0).toUpperCase() + form.status.slice(1),
            "Submission Date": new Date(form.createdAt).toLocaleDateString(),
            ...details,
            Reason: form.data?.reason || "N/A",
          })
        }
      })

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(data)

      // Set column widths
      const colWidths = [
        { wch: 15 }, // Request Type
        { wch: 25 }, // Employee Name
        { wch: 15 }, // Employee ID
        { wch: 20 }, // Department
        { wch: 20 }, // Position
        { wch: 12 }, // Status
        { wch: 15 }, // Submission Date
        { wch: 15 }, // Leave Type/Date
        { wch: 15 }, // Start Date/Hours
        { wch: 15 }, // End Date
        { wch: 10 }, // Total Days
        { wch: 10 }, // Half Day
        { wch: 10 }, // Early Leave
        { wch: 40 }, // Reason
      ]
      ws["!cols"] = colWidths

      // Create workbook
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "HR Forms")

      // Generate Excel file
      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" })

      // Generate filename
      const dateStr = new Date().toISOString().split("T")[0]
      let filename = `HR-Forms-Report-${dateStr}`

      // Add month info to filename if month filter is applied
      if (selectedMonth) {
        const monthName = new Date(selectedMonth.year, selectedMonth.month).toLocaleString("default", { month: "long" })
        filename = `HR-Forms-Report-${monthName}-${selectedMonth.year}-${dateStr}`
      }

      // Return Excel file
      return new Response(excelBuffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
        },
      })
    } else if (format === "pdf") {
      // Create PDF document
      const doc = new jsPDF()

      // Add company header
      doc.setFillColor(0, 150, 136) // Teal color
      doc.rect(0, 0, 210, 20, "F")
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(16)
      doc.setFont("helvetica", "bold")
      doc.text("PT HANG TONG MANUFACTORY", 105, 12, { align: "center" })

      // Add title
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(14)
      doc.text("HR Forms Report", 14, 30)

      // Add date range if applicable
      if (selectedMonth) {
        const startDate = new Date(selectedMonth.year, selectedMonth.month, 1)
        const endDate = new Date(selectedMonth.year, selectedMonth.month + 1, 0)
        doc.setFontSize(10)
        doc.text(`Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`, 14, 38)
      }

      // Add generation info
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 44)

      // Add table headers with background
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

      // Add table content
      let y = 64
      doc.setFont("helvetica", "normal")
      doc.setTextColor(0, 0, 0)

      // Create rows for each employee in each form
      let rowIndex = 0
      forms.forEach((form) => {
        // Check if form has multiple employees in form.data.employees
        if (form.data && form.data.employees && Array.isArray(form.data.employees) && form.data.employees.length > 0) {
          // Create a row for each employee
          form.data.employees.forEach((employee: any) => {
            // Add alternating row background
            if (rowIndex % 2 === 0) {
              doc.setFillColor(248, 248, 248)
              doc.rect(14, y - 4, 182, 10, "F")
            }

            // Type
            doc.text(form.type.charAt(0).toUpperCase() + form.type.slice(1), 16, y)

            // Employee (full name)
            doc.text(employee.name || "", 45, y)

            // Department
            doc.text(employee.department || "", 85, y)

            // Details
            const details =
              form.type === "leave" && form.data
                ? `${form.data.leaveType || "N/A"}, ${form.data.totalDays || "N/A"} days`
                : form.data
                  ? `${form.data.hours || "N/A"} hours`
                  : "N/A"
            doc.text(details, 125, y)

            // Status
            doc.text(form.status.charAt(0).toUpperCase() + form.status.slice(1), 165, y)

            // Date
            doc.text(new Date(form.createdAt).toLocaleDateString(), 185, y)

            y += 10
            rowIndex++

            // Add new page if needed
            if (y > 280) {
              doc.addPage()

              // Add header to new page
              doc.setFillColor(0, 150, 136)
              doc.rect(0, 0, 210, 15, "F")
              doc.setTextColor(255, 255, 255)
              doc.setFontSize(12)
              doc.setFont("helvetica", "bold")
              doc.text("PT HANG TONG MANUFACTORY - HR Forms Report (Continued)", 105, 10, { align: "center" })

              // Reset for content
              doc.setTextColor(0, 0, 0)
              doc.setFont("helvetica", "normal")
              y = 30
            }
          })
        } else {
          // Fallback to original employee info if no employees array
          const employeeInfo = getEmployeeInfoFromForm(form)

          // Add alternating row background
          if (rowIndex % 2 === 0) {
            doc.setFillColor(248, 248, 248)
            doc.rect(14, y - 4, 182, 10, "F")
          }

          // Type
          doc.text(form.type.charAt(0).toUpperCase() + form.type.slice(1), 16, y)

          // Employee (full name)
          doc.text(employeeInfo.name, 45, y)

          // Department
          doc.text(employeeInfo.department, 85, y)

          // Details
          const details =
            form.type === "leave" && form.data
              ? `${form.data.leaveType || "N/A"}, ${form.data.totalDays || "N/A"} days`
              : form.data
                ? `${form.data.hours || "N/A"} hours`
                : "N/A"
          doc.text(details, 125, y)

          // Status
          doc.text(form.status.charAt(0).toUpperCase() + form.status.slice(1), 165, y)

          // Date
          doc.text(new Date(form.createdAt).toLocaleDateString(), 185, y)

          y += 10
          rowIndex++

          // Add new page if needed
          if (y > 280) {
            doc.addPage()

            // Add header to new page
            doc.setFillColor(0, 150, 136)
            doc.rect(0, 0, 210, 15, "F")
            doc.setTextColor(255, 255, 255)
            doc.setFontSize(12)
            doc.setFont("helvetica", "bold")
            doc.text("PT HANG TONG MANUFACTORY - HR Forms Report (Continued)", 105, 10, { align: "center" })

            // Reset for content
            doc.setTextColor(0, 0, 0)
            doc.setFont("helvetica", "normal")
            y = 30
          }
        }
      })

      // Add footer with page numbers
      const pageCount = (doc.internal as any).getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(100, 100, 100)
        doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: "center" })
      }

      // Generate PDF buffer
      const pdfBuffer = doc.output("arraybuffer")

      // Generate filename
      const dateStr = new Date().toISOString().split("T")[0]
      let filename = `HR-Forms-Report-${dateStr}`

      // Add month info to filename if month filter is applied
      if (selectedMonth) {
        const monthName = new Date(selectedMonth.year, selectedMonth.month).toLocaleString("default", { month: "long" })
        filename = `HR-Forms-Report-${monthName}-${selectedMonth.year}-${dateStr}`
      }

      // Return PDF file
      return new Response(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}.pdf"`,
        },
      })
    }

    // If format is not supported, return error
    return NextResponse.json({ error: "Unsupported export format" }, { status: 400 })
  } catch (error) {
    console.error("Error exporting forms:", error)
    return NextResponse.json({ error: "Failed to export forms" }, { status: 500 })
  }
}
