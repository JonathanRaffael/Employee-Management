import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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

export async function POST(request: Request, context: { params: { id: string } }) {
  const session = (await getServerSession(authOptions)) as CustomSession | null

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Use the id directly from context.params
  const formId = context.params.id
  const userRole = session.user.role

  // Update to include PMC-related roles for form rejection
  const allowedRoles = ["leader", "hrd", "pmc", "pmc_admin", "pmc_manager", "admin"]
  if (!allowedRoles.includes(userRole)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Determine the actual role for approval
  let approvalRole = userRole
  if (userRole === "pmc_admin" || userRole === "pmc_manager") {
    approvalRole = "pmc"
  }

  try {
    const data = await request.json()
    const { reason } = data

    if (!reason) {
      return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 })
    }

    // Get the current form to check its status
    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        employee: true,
        approvals: true,
      },
    })

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 })
    }

    // PMC can only reject overtime forms
    if (
      (approvalRole === "pmc" || userRole === "pmc_admin" || userRole === "pmc_manager") &&
      form.type !== "overtime"
    ) {
      return NextResponse.json({ error: "PMC can only reject overtime forms" }, { status: 403 })
    }

    // Find the approval for the current user's role
    const userRoleApproval = form.approvals.find((approval) => approval.role === approvalRole)

    if (userRoleApproval) {
      // Update existing approval
      await prisma.approval.update({
        where: { id: userRoleApproval.id },
        data: {
          status: "rejected",
          approverId: session.user.id,
          comments: reason,
        },
      })
    } else {
      // Create new approval if it doesn't exist
      await prisma.approval.create({
        data: {
          formId,
          role: approvalRole,
          status: "rejected",
          approverId: session.user.id,
          comments: reason,
        },
      })
    }

    // Update the form status to rejected
    await prisma.form.update({
      where: { id: formId },
      data: { status: "rejected" },
    })

    // If the form was previously approved and is now rejected, and it's a leave form,
    // we need to adjust the leave balance back
    if (form.status === "approved" && form.type === "leave") {
      const formData = form.data as any
      const jumlahHari = formData.jumlahHari || (formData.totalDays && Number.parseInt(formData.totalDays)) || 1

      // Only update leave balance for annual leave
      if (formData.leaveType === "Annual Leave") {
        // Decrement the cutiterpakai by the number of days that were approved
        await prisma.user.update({
          where: { id: form.employeeId },
          data: {
            cutiterpakai: {
              decrement: jumlahHari,
            },
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Form rejected by ${approvalRole.toUpperCase()}`,
    })
  } catch (error) {
    console.error("Error rejecting form:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to reject form"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
