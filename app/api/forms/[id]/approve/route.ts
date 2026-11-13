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
   WITH AUTOMATIC LEAVE DEDUCTION
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

  let body: { signature?: string; comments?: string }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    )
  }

  const { signature, comments } = body

  if (!signature) {
    return NextResponse.json(
      { error: "Signature is required" },
      { status: 400 }
    )
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Ambil data form
      const form = await tx.form.findUnique({
        where: { id },
        include: { approvals: true },
      })

      if (!form) {
        throw new Error("Form not found")
      }

      if (["APPROVED", "REJECTED"].includes(normalize(form.status))) {
        throw new Error("Form already finalized")
      }

      // 2. Cari atau buat approval HRD
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

      // 3. Proses pemotongan saldo khusus Annual Leave
      const isLeaveForm = normalize(form.type) === "LEAVE"
      const leaveData = (form.data ?? {}) as Record<string, any>

      const isAnnualLeave =
        isLeaveForm &&
        String(leaveData.leaveType ?? "").trim().toLowerCase() ===
          "annual leave"

      let deductionAmount = 0
      let balanceId: string | null = null

      if (isAnnualLeave) {
        if (!form.employeeId) {
          throw new Error("Employee not found on leave form")
        }

        // Setengah hari selalu dihitung 0.5
        deductionAmount = leaveData.isHalfDay
          ? 0.5
          : Number(leaveData.jumlahHari ?? leaveData.totalDays)

        if (
          !Number.isFinite(deductionAmount) ||
          deductionAmount <= 0
        ) {
          throw new Error("Invalid annual leave duration")
        }

        // Tentukan tahun saldo berdasarkan tanggal pengajuan
        const dateValues: string[] =
          Array.isArray(leaveData.manualDates) &&
          leaveData.manualDates.length > 0
            ? leaveData.manualDates
            : [leaveData.startDate, leaveData.endDate].filter(Boolean)

        if (dateValues.length === 0) {
          throw new Error("Leave dates are required")
        }

        const leaveDates = dateValues.map((value) => new Date(value))

        if (leaveDates.some((date) => Number.isNaN(date.getTime()))) {
          throw new Error("Invalid leave date")
        }

        const leaveYear = leaveDates[0].getUTCFullYear()

        // Untuk sementara, satu pengajuan harus berada dalam satu tahun kalender
        if (
          leaveDates.some((date) => date.getUTCFullYear() !== leaveYear)
        ) {
          throw new Error(
            "Annual Leave spanning multiple calendar years is not supported"
          )
        }

        // 4. Ambil saldo karyawan
        const balance = await tx.leaveBalance.findUnique({
          where: {
            employeeId_year: {
              employeeId: form.employeeId,
              year: leaveYear,
            },
          },
        })

        if (!balance) {
          throw new Error(
            `Leave balance for year ${leaveYear} was not found`
          )
        }

        const total = Number(balance.total)
        const used = Number(balance.used)
        const remaining = total - used

        if (remaining < deductionAmount) {
          throw new Error(
            `Insufficient annual leave balance. Remaining: ${remaining} days, requested: ${deductionAmount} days`
          )
        }

        balanceId = balance.id

        // 5. Catat transaksi pemotongan
        // formId bersifat UNIQUE sehingga satu form tidak bisa
        // menghasilkan dua transaksi deduction.
        await tx.leaveTransaction.create({
          data: {
            balanceId: balance.id,
            employeeId: form.employeeId,
            type: "DEDUCTION",
            amount: deductionAmount,
            description: `Annual Leave approved - Form #${form.formNumber}`,
            formId: form.id,
            createdById: session.user.id,
          },
        })

        // 6. Update saldo terpakai
        await tx.leaveBalance.update({
          where: { id: balance.id },
          data: {
            used: {
              increment: deductionAmount,
            },
          },
        })
      }

      // 7. Update approval HRD
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

      // 8. Finalisasi form
      const approvedForm = await tx.form.update({
        where: { id },
        data: { status: "approved" },
        include: { approvals: true },
      })

      return {
        form: approvedForm,
        deductionAmount,
        balanceId,
      }
    })

    // 9. Bersihkan cache
    formCache.clear()
    countCache.clear()

    return NextResponse.json({
      success: true,
      message: "Form approved successfully",
      status: normalize(result.form.status),
      leaveDeduction: result.deductionAmount,
      balanceId: result.balanceId,
      form: result.form,
    })
  } catch (e: any) {
    console.error("Approval error:", e)

    return NextResponse.json(
      { error: e.message || "Approval failed" },
      { status: 400 }
    )
  }
}
