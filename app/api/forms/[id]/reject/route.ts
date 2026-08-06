import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const FINAL_REJECT_ROLES = ["hrd", "admin"]
const ALLOWED_ROLES = ["leader", "hrd", "supervisor", "admin"]

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: formId } = await params
  const userRole = session.user.role.toLowerCase()
  const approverId = session.user.id

  if (!ALLOWED_ROLES.includes(userRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const reason = body?.rejectionReason?.trim()

    if (!reason) {
      return NextResponse.json(
        { error: "Rejection reason is required" },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      const form = await tx.form.findUnique({
        where: { id: formId },
        include: { approvals: true },
      })

      if (!form) throw new Error("Form not found")

      // Konsisten menggunakan UPPERCASE
      if (form.status === "APPROVED") {
        throw new Error("Approved form cannot be rejected")
      }

      if (form.status === "REJECTED") {
        throw new Error("Form already rejected")
      }

      if (
        userRole === "supervisor" &&
        form.type.toLowerCase() !== "overtime"
      ) {
        throw new Error("Supervisor can only reject overtime forms")
      }

      const existingApproval = form.approvals.find(
        (a) => a.role.toLowerCase() === userRole
      )

      if (existingApproval?.status === "APPROVED") {
        throw new Error("Final approval cannot be rejected")
      }

      if (existingApproval) {
        await tx.approval.update({
          where: { id: existingApproval.id },
          data: {
            status: "REJECTED",
            approverId,
            comments: reason,
          },
        })
      } else {
        await tx.approval.create({
          data: {
            formId,
            role: userRole,
            status: "REJECTED",
            approverId,
            comments: reason,
          },
        })
      }

      // Final reject oleh HRD/Admin
      if (FINAL_REJECT_ROLES.includes(userRole)) {
        await tx.form.update({
          where: { id: formId },
          data: {
            status: "REJECTED",
          },
        })
      }

      const updatedForm = await tx.form.findUnique({
        where: { id: formId },
        include: {
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
      })

      return {
        message: FINAL_REJECT_ROLES.includes(userRole)
          ? "Form rejected"
          : "Rejection recorded (awaiting final decision)",
        form: updatedForm,
      }
    })

    return NextResponse.json({
      success: true,
      status: "REJECTED",
      ...result,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message ?? "Reject failed",
      },
      {
        status: 400,
      }
    )
  }
}