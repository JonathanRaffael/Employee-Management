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

export async function POST(request: Request) {
  // Extract the form ID from the URL path
  const url = new URL(request.url)
  const pathParts = url.pathname.split("/")
  const formId = pathParts[pathParts.length - 2] // Get the ID from the path

  // Get the session
  const session = (await getServerSession(authOptions)) as CustomSession | null

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!formId) {
    return NextResponse.json({ error: "Missing form ID" }, { status: 400 })
  }

  const userRole = session.user.role

  // Modified to include PMC in the approved roles
  if (userRole !== "leader" && userRole !== "hrd" && userRole !== "pmc" && userRole !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const data = await request.json()
    const { signature, comments, pmSignature } = data

    // Get the current form to check its status
    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        approvals: true,
        employee: true,
      },
    })

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 })
    }

    // PMC can only approve overtime forms
    if (userRole === "pmc" && form.type !== "overtime") {
      return NextResponse.json({ error: "PMC can only approve overtime forms" }, { status: 403 })
    }

    // Check if PMC has already rejected the form (only for overtime forms)
    if (form.type === "overtime") {
      const pmcApproval = form.approvals.find((approval) => approval.role === "pmc")
      if (pmcApproval && pmcApproval.status === "rejected" && userRole === "hrd") {
        return NextResponse.json(
          {
            error: "Cannot approve form that has been rejected by PMC",
          },
          { status: 400 },
        )
      }

      // Check if PMC has approved the form if HRD is trying to approve (only for overtime forms)
      if (userRole === "hrd") {
        const pmcApproval = form.approvals.find((approval) => approval.role === "pmc")
        if (!pmcApproval || pmcApproval.status !== "approved") {
          return NextResponse.json(
            {
              error: "PMC must approve overtime forms before HRD can approve",
            },
            { status: 400 },
          )
        }
      }
    }

    // Update the approval for the current user's role
    await prisma.approval.updateMany({
      where: {
        formId,
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
    if (userRole === "hrd" && form.type === "overtime" && data.pmSignature) {
      await prisma.form.update({
        where: { id: formId },
        data: {
          pmSignature: data.pmSignature,
          pmApprovalDate: new Date(),
        },
      })

      console.log("Saved Production Manager signature:", {
        formId,
        hasPmSignature: !!data.pmSignature,
        date: new Date(),
      })
    }

    // Check if all required approvals are complete
    const updatedApprovals = await prisma.approval.findMany({
      where: { formId },
    })

    // For overtime forms, we need both PMC and HRD approval
    let allApproved = false
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
      await prisma.form.update({
        where: { id: formId },
        data: { status: "approved" },
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
              }
            },
          })
        }
      }
    } else if (userRole === "pmc" && form.type === "overtime") {
      // If PMC approves an overtime form, update status to indicate it's waiting for HRD
      await prisma.form.update({
        where: { id: formId },
        data: { status: "pending_hrd" },
      })
    }

    return NextResponse.json({
      success: true,
      allApproved,
      message: allApproved
        ? "Form fully approved"
        : userRole === "pmc" && form.type === "overtime"
          ? "PMC approved, waiting for HRD approval"
          : "Approval updated",
    })
  } catch (error) {
    console.error("Error approving form:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to approve form"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}