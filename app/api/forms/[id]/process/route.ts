import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: formId } = await params

    if (!formId) {
      return NextResponse.json({ error: "Form ID is missing" }, { status: 400 })
    }

    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true },
    })

    if (!user?.role) {
      return NextResponse.json({ error: "User role not found" }, { status: 403 })
    }

    const userRole = user.role.toLowerCase()

    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: { approvals: true },
    })

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 })
    }

    // 🔒 Role restriction
    if (userRole === "supervisor" && form.type !== "overtime") {
      return NextResponse.json(
        { error: "Supervisor hanya boleh memproses lembur" },
        { status: 403 }
      )
    }

    if (userRole !== "hrd" && form.type === "leave") {
      return NextResponse.json(
        { error: "Hanya HRD yang boleh memproses cuti" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const comments =
      typeof body?.comments === "string" && body.comments.trim()
        ? body.comments.trim()
        : null

    const existingApproval = form.approvals.find(
      (a) => a.role.toLowerCase() === userRole
    )

    // ❌ Tidak boleh ubah approval yang sudah APPROVED
    if (existingApproval?.status === "APPROVED") {
      return NextResponse.json(
        { error: "Approval sudah final dan tidak bisa diubah" },
        { status: 400 }
      )
    }

    // ✅ Catat PROCESS (tanpa signature)
    if (existingApproval) {
      await prisma.approval.update({
        where: { id: existingApproval.id },
        data: {
          status: "PROCESS",
          comments,
          approverId: user.id,
        },
      })
    } else {
      await prisma.approval.create({
        data: {
          formId,
          role: userRole,
          status: "PROCESS",
          comments,
          approverId: user.id,
        },
      })
    }

     const updatedForm = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        approvals: {
          include: {
            approver: {
              select: { id: true, name: true, role: true },
            },
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      status: "PROCESS",
      message: "Form marked as In Process",
      form: updatedForm,
    })
  } catch (error) {
    console.error("PROCESS FORM ERROR:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to process form",
      },
      { status: 500 }
    )
  }
}
