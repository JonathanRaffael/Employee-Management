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
  try {
    // Use the id directly from context.params
    const formId = context.params.id

    const session = (await getServerSession(authOptions)) as CustomSession | null
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: { approvals: true },
    })

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 })
    }

    // PMC can only process overtime forms
    if (user.role === "pmc" && form.type !== "overtime") {
      return NextResponse.json({ error: "PMC can only process overtime forms" }, { status: 403 })
    }

    // HRD can process any form
    if (user.role !== "hrd" && user.role === "pmc" && form.type !== "overtime") {
      return NextResponse.json({ error: "Unauthorized. HRD role required for leave forms." }, { status: 403 })
    }

    const { signature, comments } = await request.json()

    // Find the approval for the current user's role
    const userRoleApproval = form.approvals.find(
      (approval: { role: string; id: string }) => approval.role === user.role,
    )

    if (userRoleApproval) {
      // Update existing approval
      await prisma.approval.update({
        where: { id: userRoleApproval.id },
        data: {
          status: "process",
          signature,
          comments,
          approverId: user.id,
        },
      })
    } else {
      // Create new approval if it doesn't exist
      await prisma.approval.create({
        data: {
          formId,
          role: user.role,
          status: "process",
          signature,
          comments,
          approverId: user.id,
        },
      })
    }

    await prisma.form.update({
      where: { id: formId },
      data: {
        status: "process",
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error processing form:", error)
    return NextResponse.json({ error: "Failed to process form" }, { status: 500 })
  }
}
