import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { formCache, countCache } from "@/lib/form-cache"

interface SessionUser {
  id: string
  role: string
}

interface CustomSession {
  user: SessionUser
}

const normalize = (v?: string | null) => v?.toUpperCase() ?? ""

function canAccessForm(role: string, type?: string) {
  if (["ADMIN", "HRD"].includes(role)) return true
  if (role === "SUPERVISOR") return type === "OVERTIME"
  return false
}

/* =========================
   GET FORM DETAIL
========================= */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = (await getServerSession(authOptions)) as CustomSession | null

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = normalize(session.user.role)

  const form = await prisma.form.findUnique({
    where: { id },
    include: {
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
        include: {
          approver: {
            select: { id: true, name: true, role: true },
          },
        },
      },
    },
  })

  if (!form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 })
  }

  if (!canAccessForm(role, normalize(form.type))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const leaderApproved = form.approvals.some(
    (a) => normalize(a.role) === "LEADER" && normalize(a.status) === "APPROVED",
  )

  // HRD bisa approve jika:
  // 1. Form status masih PENDING
  // 2. User adalah HRD
  // 3. LEADER sudah approve (atau tidak ada LEADER approval record)
  const hasLeaderApproval = form.approvals.some(
    (a) => normalize(a.role) === "LEADER",
  )
  const canApproveForm = 
    normalize(form.status) === "PENDING" && 
    role === "HRD" && 
    (!hasLeaderApproval || leaderApproved)

  return NextResponse.json({
    id: form.id,
    formNumber: form.formNumber,
    type: normalize(form.type),
    status: normalize(form.status),
    createdAt: form.createdAt,
    updatedAt: form.updatedAt,
    data: form.data,
    employee: form.employee,
    approvals: form.approvals.map((a) => ({
      id: a.id,
      role: normalize(a.role),
      status: normalize(a.status),
      comments: a.comments,
      signature: a.signature,
      approvedAt: a.approvedAt,
      approver: a.approver,
    })),
    canApprove: canApproveForm,
  })
}

/* =========================
   HRD APPROVAL (FINAL)
========================= */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = (await getServerSession(authOptions)) as CustomSession | null

    if (!session || normalize(session.user.role) !== "HRD") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { signature, comments } = await req.json()

    if (!signature) {
      return NextResponse.json({ error: "Signature is required" }, { status: 400 })
    }

    console.log("[v0] HRD approval started for form:", id, "by user:", session.user.id)

    const result = await prisma.$transaction(async (tx) => {
      const form = await tx.form.findUnique({
        where: { id },
        include: { approvals: true },
      })

      if (!form) {
        console.log("[v0] Form not found:", id)
        throw new Error("Form not found")
      }

      console.log("[v0] Form current status:", form.status)

      if (["APPROVED", "REJECTED"].includes(normalize(form.status))) {
        console.log("[v0] Form already finalized:", form.status)
        throw new Error("Form already finalized")
      }

      // Cari atau buat HRD approval record
      let hrdApproval = form.approvals.find((a) => normalize(a.role) === "HRD")

      if (!hrdApproval) {
        console.log("[v0] Creating new HRD approval record for form:", id)
        hrdApproval = await tx.approval.create({
          data: {
            formId: id,
            role: "HRD",
            status: "PENDING",
          },
        })
      }

      console.log("[v0] HRD approval found/created:", hrdApproval.id, "Status:", hrdApproval.status)

      // Check jika HRD approval sudah finalized
      if (["APPROVED", "REJECTED"].includes(normalize(hrdApproval.status))) {
        console.log("[v0] HRD approval already finalized:", hrdApproval.status)
        throw new Error("HRD approval already finalized")
      }

      const updatedApproval = await tx.approval.update({
        where: { id: hrdApproval.id },
        data: {
          status: "APPROVED",
          signature,
          comments,
          approvedAt: new Date(),
          approverId: session.user.id,
        },
      })

      console.log("[v0] Approval record updated:", updatedApproval.id, "Status:", updatedApproval.status)

      const updatedForm = await tx.form.update({
        where: { id },
        data: {
          status: "APPROVED",
          updatedAt: new Date(),
        },
        include: {
          approvals: true,
          employee: {
            select: {
              id: true,
              name: true,
              employeeCode: true,
              department: true,
              position: true,
            },
          },
        },
      })

      return { form: updatedForm, approval: updatedApproval }
    })

    formCache.clear()
    countCache.clear()

    console.log("[v0] Transaction completed successfully, form status:", result.form.status)

    return NextResponse.json({
      success: true,
      message: "Form approved successfully",
      form: result.form,
    })
  } catch (error: any) {
    console.error("[v0] PATCH error:", error)
    return NextResponse.json({ error: error.message || "Approval failed" }, { status: 400 })
  }
}

/* =========================
   REJECT FORM
========================= */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = (await getServerSession(authOptions)) as CustomSession | null

    if (!session || !["ADMIN", "HRD"].includes(normalize(session.user.role))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { action, signature, comments } = await req.json()

    if (action !== "reject") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    console.log("[v0] HRD rejection started for form:", id, "by user:", session.user.id)

    const result = await prisma.$transaction(async (tx) => {
      const form = await tx.form.findUnique({
        where: { id },
        include: { approvals: true },
      })

      if (!form) {
        console.log("[v0] Form not found:", id)
        throw new Error("Form not found")
      }

      if (["APPROVED", "REJECTED"].includes(normalize(form.status))) {
        console.log("[v0] Form already finalized:", form.status)
        throw new Error("Form already finalized")
      }

      // Cari atau buat HRD approval record
      let hrdApproval = form.approvals.find((a) => normalize(a.role) === "HRD")

      if (!hrdApproval) {
        console.log("[v0] Creating new HRD approval record for rejection")
        hrdApproval = await tx.approval.create({
          data: {
            formId: id,
            role: "HRD",
            status: "PENDING",
          },
        })
      }

      // Check jika HRD approval sudah finalized
      if (["APPROVED", "REJECTED"].includes(normalize(hrdApproval.status))) {
        console.log("[v0] HRD approval already finalized:", hrdApproval.status)
        throw new Error("HRD approval already finalized")
      }

      const updatedApproval = await tx.approval.update({
        where: { id: hrdApproval.id },
        data: {
          status: "REJECTED",
          signature,
          comments,
          approvedAt: new Date(),
          approverId: session.user.id,
        },
      })

      const updatedForm = await tx.form.update({
        where: { id },
        data: {
          status: "REJECTED",
          updatedAt: new Date(),
        },
        include: {
          approvals: true,
          employee: {
            select: {
              id: true,
              name: true,
              employeeCode: true,
              department: true,
              position: true,
            },
          },
        },
      })

      return { form: updatedForm, approval: updatedApproval }
    })

    formCache.clear()
    countCache.clear()

    console.log("[v0] Rejection completed successfully, form status:", result.form.status)

    return NextResponse.json({
      success: true,
      message: "Form rejected successfully",
      form: result.form,
    })
  } catch (error: any) {
    console.error("[v0] POST error:", error)
    return NextResponse.json({ error: error.message || "Rejection failed" }, { status: 400 })
  }
}

/* =========================
   UPDATE FORM DATA (PUT)
========================= */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = (await getServerSession(authOptions)) as CustomSession | null

  if (!session || !["ADMIN", "HRD"].includes(normalize(session.user.role))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const form = await prisma.form.findUnique({ where: { id } })

  if (!form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 })
  }

  if (["APPROVED", "REJECTED"].includes(normalize(form.status))) {
    return NextResponse.json({ error: "Finalized form cannot be edited" }, { status: 400 })
  }

  const payload = await req.json()

  const updated = await prisma.form.update({
    where: { id },
    data: { data: payload.formData },
  })

  formCache.clear()
  countCache.clear()

  return NextResponse.json({ success: true, form: updated })
}

/* =========================
   DELETE FORM
========================= */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = (await getServerSession(authOptions)) as CustomSession | null

  if (!session || !["ADMIN", "HRD"].includes(normalize(session.user.role))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const form = await prisma.form.findUnique({ where: { id } })

  if (!form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 })
  }

  await prisma.$transaction(async (tx) => {
    await tx.approval.deleteMany({ where: { formId: id } })
    await tx.form.delete({ where: { id } })
  })

  formCache.clear()
  countCache.clear()

  return NextResponse.json({ success: true })
}
