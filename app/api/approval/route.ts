import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface SessionUser {
  id: string
  role: string
}

interface CustomSession {
  user: SessionUser
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const formId = params.id
  const session = (await getServerSession(authOptions)) as CustomSession | null

  if (!session || session.user.role !== "hrd") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { signature, pmSignature, comments } = body
    const status = "approved" // Since this is the approve endpoint

    if (!signature || !pmSignature) {
      return NextResponse.json({ error: "Signatures are required" }, { status: 400 })
    }

    // Update approval record for HRD
    await prisma.approval.updateMany({
      where: {
        formId,
        role: "hrd",
      },
      data: {
        status,
        signature,
        comments,
        approverId: session.user.id,
      },
    })

    // Update form status and store Production Manager signature
    await prisma.form.update({
      where: { id: formId },
      data: {
        status,
        pmSignature, // Store the Production Manager signature directly on the form
        pmApprovalDate: new Date(), // Add approval date
      },
    })

    // If approved and type is 'leave', update cutiterpakai
    const form = await prisma.form.findUnique({
      where: { id: formId },
      select: {
        type: true,
        employeeId: true,
        data: true,
      },
    })

    if (form?.type === "leave") {
      const totalDays = Number((form.data as Record<string, any>)?.totalDays || 0)

      await prisma.user.update({
        where: { id: form.employeeId },
        data: {
          cutiterpakai: {
            increment: totalDays,
          },
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error processing approval:", error)
    return NextResponse.json({ error: "Failed to process approval" }, { status: 500 })
  }
}
