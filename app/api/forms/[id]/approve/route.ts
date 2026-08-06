import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// cache untuk dashboard
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
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = (await getServerSession(authOptions)) as CustomSession | null

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = normalize(session.user.role)

  const form = await prisma.form.findUnique({
    where: { id },
    include: {
      employee: true,
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

  return NextResponse.json({
    id: form.id,
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
    canApprove:
      role === "HRD" &&
      !["APPROVED", "REJECTED"].includes(normalize(form.status)),
  })
}

/* =========================
   PATCH — HRD FINAL APPROVAL
========================= */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = (await getServerSession(authOptions)) as CustomSession | null

  if (!session || normalize(session.user.role) !== "HRD") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { signature, comments } = await req.json()

  if (!signature) {
    return NextResponse.json(
      { error: "Signature is required" },
      { status: 400 }
    )
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const form = await tx.form.findUnique({
        where: { id },
        include: { approvals: true },
      })

      if (!form) {
        throw new Error("Form not found")
      }

      // form sudah final → stop
      if (["APPROVED", "REJECTED"].includes(normalize(form.status))) {
        throw new Error("Form already finalized")
      }

      // cari / buat approval HRD
      let hrdApproval = form.approvals.find(
        (a) => normalize(a.role) === "HRD"
      )

      if (!hrdApproval) {
        hrdApproval = await tx.approval.create({
          data: {
            formId: id,
            role: "HRD",
            status: "PENDING",
          },
        })
      }

      if (["APPROVED", "REJECTED"].includes(normalize(hrdApproval.status))) {
        throw new Error("HRD already finalized")
      }

      // update approval HRD
      await tx.approval.update({
        where: { id: hrdApproval.id },
        data: {
          status: "APPROVED",
          approverId: session.user.id,
          signature,
          comments,
          approvedAt: new Date(),
        },
      })

      // 🔒 FINAL DECISION — KUNCI STATUS FORM
      return tx.form.update({
  where: { id },
  data: { status: "APPROVED" },   // ✅ BENAR
  include: { approvals: true },
})
    })

    // invalidate cache dashboard
    formCache.clear()
    countCache.clear()

    return NextResponse.json({
      success: true,
      message: "Form approved (FINAL)",
      status: normalize(result.status),
      form: result,
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Approval failed" },
      { status: 400 }
    )
  }
}