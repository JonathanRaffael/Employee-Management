import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
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

// Extend the Session type to use our custom user type
interface CustomSession {
  user: SessionUser
}

// Function to send email notifications when form status changes
async function sendStatusUpdateEmail(form: any) {
  try {
    const formType = form.type === "leave" ? "Leave Request" : "Overtime Request"
    const formNumber = form.formNumber ? form.formNumber.toString().padStart(4, "0") : form.id

    // Create email content based on form status
    let subject = `${formType} Form #${formNumber} Status Update`
    let statusText = "updated"

    switch (form.status) {
      case "approved":
        statusText = "APPROVED"
        subject = `${formType} Form #${formNumber} has been APPROVED`
        break
      case "rejected":
        statusText = "REJECTED"
        subject = `${formType} Form #${formNumber} has been REJECTED`
        break
      case "pending_hrd":
        statusText = "pending HRD approval"
        subject = `${formType} Form #${formNumber} - PMC Approved, Awaiting HRD`
        break
      case "pending_pmc":
        statusText = "pending PMC approval"
        break
      case "process":
        statusText = "in process"
        break
    }

    // Format dates for email
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString()
    }

    // Create HTML content for email
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0f766e;">${formType} Form Status Update</h2>
        <p>Form #${formNumber} has been <strong>${statusText}</strong>.</p>
        
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 5px; padding: 15px; margin: 15px 0;">
          <h3 style="margin-top: 0;">Form Details:</h3>
          <p><strong>Form Type:</strong> ${formType}</p>
          <p><strong>Form ID:</strong> ${formNumber}</p>
          <p><strong>Status:</strong> ${form.status}</p>
          <p><strong>Submitted On:</strong> ${formatDate(form.createdAt)}</p>
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
        
        <p>Please log in to the system to view the complete details.</p>
        <p>This is an automated notification. Please do not reply to this email.</p>
      </div>
    `

    // Determine recipients based on form type and status
    const recipients = []

    // Always notify the employee who submitted the form if we have their email
    if (form.employee?.email) {
      recipients.push(form.employee.email)
    }

    // For pending_hrd status, notify HRD
    if (form.status === "pending_hrd" || form.status === "pending") {
      recipients.push(process.env.HRD_EMAIL || "hrd@example.com")
    }

    // For overtime forms with pending status, notify PMC
    if (form.type === "overtime" && (form.status === "pending_pmc" || form.status === "pending")) {
      recipients.push(process.env.PMC_EMAIL || "pmc@example.com")
    }

    // For approved or rejected status, notify both HRD and PMC (for overtime)
    if (form.status === "approved" || form.status === "rejected") {
      recipients.push(process.env.HRD_EMAIL || "hrd@example.com")
      if (form.type === "overtime") {
        recipients.push(process.env.PMC_EMAIL || "pmc@example.com")
      }
    }

    // Remove duplicates
    const uniqueRecipients = [...new Set(recipients)]

    // Send emails to all recipients
    for (const recipient of uniqueRecipients) {
      await sendMail({
        to: recipient,
        subject,
        html: htmlContent,
      })
    }

    console.log(`Status update emails sent to ${uniqueRecipients.join(", ")}`)
    return true
  } catch (error) {
    console.error("Error sending status update emails:", error)
    return false
  }
}

// Function to send email notification when a form is deleted
async function sendFormDeletionEmail(form: any, deletedBy: SessionUser) {
  try {
    const formType = form.type === "leave" ? "Leave Request" : "Overtime Request"
    const formNumber = form.formNumber ? form.formNumber.toString().padStart(4, "0") : form.id

    const subject = `${formType} Form #${formNumber} Has Been Deleted`

    // Format dates for email
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString()
    }

    // Create HTML content for email
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Form Deletion Notification</h2>
        <p>Dear ${form.employee?.name || "Employee"},</p>
        <p>Your ${formType.toLowerCase()} form #${formNumber} has been deleted from the system.</p>
        
        <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 5px; padding: 15px; margin: 15px 0;">
          <h3 style="margin-top: 0;">Deleted Form Details:</h3>
          <p><strong>Form Type:</strong> ${formType}</p>
          <p><strong>Form Number:</strong> ${formNumber}</p>
          <p><strong>Status at Deletion:</strong> ${form.status.charAt(0).toUpperCase() + form.status.slice(1)}</p>
          <p><strong>Submitted On:</strong> ${formatDate(form.createdAt)}</p>
          <p><strong>Deleted On:</strong> ${formatDate(new Date().toISOString())}</p>
          <p><strong>Deleted By:</strong> ${deletedBy.name} (${deletedBy.role.toUpperCase()})</p>
          ${
            form.type === "leave"
              ? `<p><strong>Leave Type:</strong> ${form.data?.leaveType || "N/A"}</p>
                 <p><strong>Date Range:</strong> ${form.data?.startDate ? formatDate(form.data.startDate) : "N/A"} - ${form.data?.endDate ? formatDate(form.data.endDate) : "N/A"}</p>
                 <p><strong>Total Days:</strong> ${form.data?.totalDays || "N/A"}</p>`
              : `<p><strong>Date:</strong> ${form.data?.date ? formatDate(form.data.date) : "N/A"}</p>
                 <p><strong>Hours:</strong> ${form.data?.hours || "N/A"}</p>`
          }
          <p><strong>Reason:</strong> ${form.data?.reason || "N/A"}</p>
        </div>
        
        <p>If you have any questions about this deletion, please contact the HR department.</p>
        <p>This is an automated notification. Please do not reply to this email.</p>
      </div>
    `

    // Send email to the employee if email exists
    if (form.employee?.email) {
      await sendMail({
        to: form.employee.email,
        subject,
        html: htmlContent,
      })

      console.log(`Form deletion notification sent to ${form.employee.email}`)
    }

    // Also notify HRD and PMC (for overtime) about the deletion
    const recipients = [process.env.HRD_EMAIL || "hrd@example.com"]
    if (form.type === "overtime") {
      recipients.push(process.env.PMC_EMAIL || "pmc@example.com")
    }

    const adminSubject = `${formType} Form #${formNumber} Deleted by ${deletedBy.name}`
    const adminHtmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Form Deletion Alert</h2>
        <p>A ${formType.toLowerCase()} form has been deleted from the system.</p>
        
        <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 5px; padding: 15px; margin: 15px 0;">
          <h3 style="margin-top: 0;">Deletion Details:</h3>
          <p><strong>Form Type:</strong> ${formType}</p>
          <p><strong>Form Number:</strong> ${formNumber}</p>
          <p><strong>Employee:</strong> ${form.employee?.name || "Unknown"} (${form.employee?.employeeId || "N/A"})</p>
          <p><strong>Status at Deletion:</strong> ${form.status.charAt(0).toUpperCase() + form.status.slice(1)}</p>
          <p><strong>Deleted By:</strong> ${deletedBy.name} (${deletedBy.email}) - Role: ${deletedBy.role.toUpperCase()}</p>
          <p><strong>Deleted On:</strong> ${formatDate(new Date().toISOString())}</p>
        </div>
        
        <p>This is an automated notification for audit purposes.</p>
      </div>
    `

    // Send to admin recipients
    for (const recipient of recipients) {
      await sendMail({
        to: recipient,
        subject: adminSubject,
        html: adminHtmlContent,
      })
    }

    return true
  } catch (error) {
    console.error("Error sending form deletion emails:", error)
    return false
  }
}

// DELETE /api/forms/[id] - Delete a specific form
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = (await getServerSession(authOptions)) as CustomSession | null

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Only allow HRD and admin to delete forms
  if (session.user.role !== "admin" && session.user.role !== "hrd") {
    return NextResponse.json(
      {
        error: "Insufficient permissions. Only HRD and administrators can delete forms.",
      },
      { status: 403 },
    )
  }

  try {
    // Await params before accessing properties (Next.js 15 requirement)
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: "Form ID is required" }, { status: 400 })
    }

    // Check if form exists and get form details for verification and email notification
    const existingForm = await prisma.form.findUnique({
      where: { id },
      select: {
        id: true,
        employeeId: true,
        status: true,
        type: true,
        formNumber: true,
        createdAt: true,
        data: true,
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            employeeId: true,
            department: true,
            position: true,
          },
        },
        approvals: {
          select: {
            id: true,
            role: true,
            status: true,
            approverId: true,
          },
        },
      },
    })

    if (!existingForm) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 })
    }

    // If the form is approved and it's a leave form, we need to reverse the leave balance
    if (existingForm.status === "approved" && existingForm.type === "leave") {
      const formData = existingForm.data as any
      const jumlahHari = formData.jumlahHari || (formData.totalDays && Number.parseInt(formData.totalDays)) || 1

      // Only reverse leave balance for annual leave
      if (formData.leaveType === "Annual Leave") {
        // Reverse the cutiterpakai in the user record
        await prisma.user.update({
          where: { id: existingForm.employeeId },
          data: {
            cutiterpakai: {
              decrement: jumlahHari,
            },
          },
        })
        console.log(`Reversed ${jumlahHari} days from employee ${existingForm.employee?.name}'s leave balance`)
      }
    }

    // Use transaction to ensure data consistency
    await prisma.$transaction(async (tx) => {
      // Delete related approvals first (cascade delete)
      await tx.approval.deleteMany({
        where: { formId: id },
      })

      // Delete any related notifications if they exist
      // Uncomment if you have notifications table
      // await tx.notification.deleteMany({
      //   where: { formId: id },
      // })

      // Delete the form
      await tx.form.delete({
        where: { id },
      })
    })

    // Log the deletion for audit purposes
    console.log(`Form ${id} (Form #${existingForm.formNumber}) deleted successfully`)
    console.log(`Deleted by: ${session.user.name} (${session.user.id}) - Role: ${session.user.role}`)
    console.log(
      `Form details: Type: ${existingForm.type}, Status: ${existingForm.status}, Employee: ${existingForm.employee?.name}`,
    )

    // Send email notification about form deletion
    try {
      await sendFormDeletionEmail(existingForm, session.user)
    } catch (emailError) {
      console.error("Failed to send deletion notification email:", emailError)
      // Don't fail the deletion if email fails
    }

    return NextResponse.json(
      {
        success: true,
        message: "Form deleted successfully",
        deletedForm: {
          id,
          formNumber: existingForm.formNumber,
          type: existingForm.type,
          status: existingForm.status,
          employeeName: existingForm.employee?.name,
          employeeId: existingForm.employee?.employeeId,
          department: existingForm.employee?.department,
        },
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Error deleting form:", error)

    // Handle specific Prisma errors
    if (error instanceof Error && "code" in (error as any)) {
      const prismaError = error as any
      if (prismaError.code === "P2025") {
        return NextResponse.json(
          {
            error: "Form not found or already deleted",
          },
          { status: 404 },
        )
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

// GET /api/forms/[id] - Get a specific form
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = (await getServerSession(authOptions)) as CustomSession | null

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Await params before accessing properties
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: "Form ID is required" }, { status: 400 })
    }

    // Build where clause based on user role
    const whereClause: any = { id }

    // Regular employees can only view their own forms
    if (session.user.role !== "admin" && session.user.role !== "hrd" && session.user.role !== "pmc") {
      whereClause.employeeId = session.user.id
    }

    // PMC users can only view overtime forms
    if (session.user.role === "pmc") {
      whereClause.type = "overtime"
    }

    const form = await prisma.form.findUnique({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
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
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    })

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 })
    }

    // If PMC user is trying to access a leave form, deny access
    if (session.user.role === "pmc" && form.type !== "overtime") {
      return NextResponse.json({ error: "PMC can only access overtime forms" }, { status: 403 })
    }

    return NextResponse.json(form)
  } catch (error) {
    console.error("Error fetching form:", error)
    return NextResponse.json({ error: "Failed to fetch form" }, { status: 500 })
  }
}

// POST /api/forms/[id] - Approve a specific form
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = (await getServerSession(authOptions)) as CustomSession | null

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Await params before accessing properties
  const { id } = await params
  const userRole = session.user.role

  // Allow leaders, HRD, admin, and pmc to approve forms
  if (userRole !== "leader" && userRole !== "hrd" && userRole !== "admin" && userRole !== "pmc") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const data = await request.json()
    const { signature, comments, pmSignature } = data

    // Get the current form to check its status
    const form = await prisma.form.findUnique({
      where: { id },
      include: {
        approvals: true,
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 })
    }

    // Store original status to check if it changes
    const originalStatus = form.status

    // PMC can only approve overtime forms
    if (userRole === "pmc" && form.type !== "overtime") {
      return NextResponse.json({ error: "PMC can only access overtime forms" }, { status: 403 })
    }

    // Update the approval for the current user's role
    await prisma.approval.updateMany({
      where: {
        formId: id,
        role: userRole,
      },
      data: {
        status: "approved",
        approverId: session.user.id,
        signature: signature || null,
        comments: comments || null,
      },
    })

    // If HRD is approving an overtime form and pmSignature is provided, save it to the form
    if (userRole === "hrd" && form.type === "overtime" && pmSignature) {
      await prisma.form.update({
        where: { id },
        data: {
          pmSignature,
          pmApprovalDate: new Date(),
        },
      })
    }

    // Check if all required approvals are complete
    const updatedApprovals = await prisma.approval.findMany({
      where: { formId: id },
    })

    // For overtime forms, we need both PMC and HRD approval
    let allApproved = false
    let newStatus = form.status

    if (form.type === "overtime") {
      const pmcApproval = updatedApprovals.find((approval) => approval.role === "pmc")
      const hrdApproval = updatedApprovals.find((approval) => approval.role === "hrd")
      const leaderApproval = updatedApprovals.find((approval) => approval.role === "leader")

      const pmcApproved = pmcApproval ? pmcApproval.status === "approved" : false
      const hrdApproved = hrdApproval ? hrdApproval.status === "approved" : false
      const leaderApproved = leaderApproval ? leaderApproval.status === "approved" : false

      allApproved = pmcApproved && hrdApproved && leaderApproved
    } else {
      // For leave forms, we only need leader and HRD approval
      const hrdApproval = updatedApprovals.find((approval) => approval.role === "hrd")
      const leaderApproval = updatedApprovals.find((approval) => approval.role === "leader")

      const hrdApproved = hrdApproval ? hrdApproval.status === "approved" : false
      const leaderApproved = leaderApproval ? leaderApproval.status === "approved" : false

      allApproved = hrdApproved && leaderApproved
    }

    // If all approvals are complete, update the form status
    if (allApproved) {
      newStatus = "approved"
      await prisma.form.update({
        where: { id },
        data: { status: newStatus },
      })

      // If it's a leave form and now fully approved, update the employee's leave balance
      if (form.type === "leave") {
        // Extract jumlahHari from the form data
        const formData = form.data as any
        const jumlahHari = formData.jumlahHari || (formData.totalDays && Number.parseInt(formData.totalDays)) || 1

        // Only update leave balance for annual leave
        if (formData.leaveType === "Annual Leave") {
          // Update cutiterpakai in the user record
          await prisma.user.update({
            where: { id: form.employeeId },
            data: {
              cutiterpakai: {
                increment: jumlahHari,
              },
            },
          })
        }
      }
    } else if (form.type === "overtime") {
      // Check if PMC has approved but HRD hasn't yet
      const pmcApproval = updatedApprovals.find((approval) => approval.role === "pmc")
      const hrdApproval = updatedApprovals.find((approval) => approval.role === "hrd")

      if (pmcApproval?.status === "approved" && hrdApproval?.status !== "approved") {
        // If PMC has approved but HRD hasn't, update status to indicate it's waiting for HRD
        newStatus = "pending_hrd"
        await prisma.form.update({
          where: { id },
          data: { status: newStatus },
        })
      } else if (userRole === "pmc") {
        // If current approver is PMC, update status immediately
        newStatus = "pending_hrd"
        await prisma.form.update({
          where: { id },
          data: { status: newStatus },
        })
      }
    }

    // If status has changed, send email notifications
    if (newStatus !== originalStatus) {
      // Get the updated form with all necessary data for the email
      const updatedForm = await prisma.form.findUnique({
        where: { id },
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })

      if (updatedForm) {
        // Send email notifications
        await sendStatusUpdateEmail(updatedForm)
      }
    }

    return NextResponse.json({
      success: true,
      allApproved,
      message: allApproved ? "Form fully approved" : "Approval updated",
    })
  } catch (error) {
    console.error("Error approving form:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to approve form"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

// PUT /api/forms/[id] - Update a specific form (for status changes, rejections, etc.)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = (await getServerSession(authOptions)) as CustomSession | null

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Await params before accessing properties
    const { id } = await params
    const data = await request.json()

    if (!id) {
      return NextResponse.json({ error: "Form ID is required" }, { status: 400 })
    }

    // Check if form exists
    const existingForm = await prisma.form.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!existingForm) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 })
    }

    // Handle different types of updates based on user role and data provided
    const updateData: any = {}
    const userRole = session.user.role

    // Status updates (for rejections mainly, since approvals are handled in POST)
    if (data.status) {
      // Only allow certain roles to update status
      if (
        userRole === "admin" ||
        userRole === "hrd" ||
        (userRole === "pmc" && existingForm.type === "overtime") ||
        userRole === "leader"
      ) {
        updateData.status = data.status

        // If rejecting, also update the relevant approval record
        if (data.status === "rejected") {
          await prisma.approval.updateMany({
            where: {
              formId: id,
              role: userRole,
            },
            data: {
              status: "rejected",
              approverId: session.user.id,
              comments: data.comments || "Form rejected",
            },
          })
        }
      } else {
        return NextResponse.json(
          {
            error: "Insufficient permissions to update form status",
          },
          { status: 403 },
        )
      }
    }

    // Form data updates (only by form owner or admin/HRD for pending forms)
    if (data.formData) {
      if (
        (existingForm.employeeId === session.user.id && existingForm.status === "pending") ||
        userRole === "admin" ||
        userRole === "hrd"
      ) {
        updateData.data = data.formData
      } else {
        return NextResponse.json(
          {
            error: "Insufficient permissions to update form data or form is no longer editable",
          },
          { status: 403 },
        )
      }
    }

    // Update the form
    const updatedForm = await prisma.form.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
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
                email: true,
                role: true,
              },
            },
          },
        },
      },
    })

    // If status was updated, send email notifications
    if (data.status && data.status !== existingForm.status) {
      try {
        await sendStatusUpdateEmail(updatedForm)
      } catch (emailError) {
        console.error("Failed to send status update email:", emailError)
        // Don't fail the update if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: "Form updated successfully",
      form: updatedForm,
    })
  } catch (error) {
    console.error("Error updating form:", error)

    // Handle specific Prisma errors
    if (error instanceof Error && "code" in (error as any)) {
      const prismaError = error as any
      if (prismaError.code === "P2025") {
        return NextResponse.json({ error: "Form not found" }, { status: 404 })
      }
    }

    return NextResponse.json(
      {
        error: "Failed to update form",
      },
      { status: 500 },
    )
  }
}
