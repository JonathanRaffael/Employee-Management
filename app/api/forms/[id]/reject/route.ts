import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "hrd") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formId = params.id

  try {
    const data = await request.json()
    const { reason } = data

    // Update the HRD approval
    await prisma.approval.updateMany({
      where: {
        formId,
        role: "hrd",
      },
      data: {
        status: "rejected",
        approverId: session.user.id,
        comments: reason,
      },
    })

    // Update the form status
    await prisma.form.update({
      where: { id: formId },
      data: { status: "rejected" },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error rejecting form:", error)
    return NextResponse.json({ error: "Failed to reject form" }, { status: 500 })
  }
}
