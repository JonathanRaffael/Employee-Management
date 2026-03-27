import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import FormDetails from "@/components/forms/form-details"
import type { FormData } from "@/types/form"

export const dynamic = "force-dynamic"

/* =========================
   SESSION TYPES
========================= */
interface SessionUser {
  id: string
  role: string
}

interface CustomSession {
  user: SessionUser
}

/* =========================
   SERVER FETCH
========================= */
async function getFormData(
  formId: string,
  session: CustomSession
): Promise<FormData | null> {
  const role = session.user.role.toUpperCase()

  const where: any = { id: formId }

  if (!["ADMIN", "HRD"].includes(role)) {
    where.OR = [
      { createdById: session.user.id },
      {
        approvals: {
          some: {
            approverId: session.user.id,
          },
        },
      },
    ]
  }

  if (role === "SUPERVISOR") {
    where.type = "overtime"
  }

  const form = await prisma.form.findFirst({
    where,
    include: {
      employee: true,
      approvals: {
        orderBy: { createdAt: "asc" },
        include: { approver: true },
      },
    },
  })

  if (!form) return null

  return {
    id: form.id,
    formNumber: form.formNumber ?? undefined,
    type: form.type,
    status: form.status,
    data: form.data,
    createdAt: form.createdAt.toISOString(),
    updatedAt: form.updatedAt.toISOString(),
    employee: {
      id: form.employee.id,
      employeeId: form.employee.id,
      name: form.employee.name,
      employeeCode: form.employee.employeeCode,
      department: form.employee.department,
      position: form.employee.position,
    },
    approvals: form.approvals.map(a => ({
      id: a.id,
      role: a.role,
      status: a.status,
      comments: a.comments ?? undefined,
      signature: a.signature ?? undefined,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt?.toISOString(),
      approver: a.approver
        ? {
            id: a.approver.id,
            name: a.approver.name ?? "Unknown",
            role: a.approver.role ?? "UNKNOWN",
          }
        : undefined,
    })),
  }
}

/* =========================
   PAGE (FIXED)
========================= */
export default async function FormDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  // 🔥 INI KUNCI UTAMA
  const { id } = await params

  const session = (await getServerSession(authOptions)) as CustomSession | null
  if (!session) redirect("/login")

  const form = await getFormData(id, session)
  if (!form) redirect("/dashboard")

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <Suspense fallback={<div>Loading...</div>}>
        <FormDetails
          form={form}
          userRole={session.user.role}
          userId={session.user.id}
        />
      </Suspense>
    </main>
  )
}
