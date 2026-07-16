import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface SessionUser {
  id: string
  role?: string | null
  department?: string | null
}

interface CustomSession {
  user: SessionUser
}

class UltraFastCache {
  private cache = new Map<string, { data: any; timestamp: number }>()
  private readonly ttl = 45_000

  get(key: string) {
    const entry = this.cache.get(key)

    if (!entry) return null

    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  set(key: string, data: any) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    })
  }
}

const statsCache = new UltraFastCache()

export async function GET() {
  const session = (await getServerSession(
    authOptions
  )) as CustomSession | null

  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  const role = session.user.role?.toLowerCase() || ""

  const cacheKey = `stats:${role}:${session.user.id}`

  const cached = statsCache.get(cacheKey)

  if (cached) {
    return NextResponse.json(cached)
  }

  const where: any = {}

  // Leader hanya melihat department sendiri
  if (role === "leader") {
    where.employee = {
      department: session.user.department,
    }
  }

  // Supervisor hanya overtime
  if (role === "supervisor") {
    where.type = "overtime"
  }

  const forms = await prisma.form.findMany({
    where,
    select: {
      status: true,
      type: true,
    },
  })

  const stats = {
    total: forms.length,
    totalRequests: forms.length,

    pending: 0,
    approved: 0,
    rejected: 0,

    totalLeave: 0,
    totalOvertime: 0,
    totalJobRequisition: 0,
    totalTrainingRequest: 0,

    pendingLeave: 0,
    pendingOvertime: 0,
    pendingJobRequisition: 0,
    pendingTrainingRequest: 0,

    approvedLeave: 0,
    approvedOvertime: 0,
    approvedJobRequisition: 0,
    approvedTrainingRequest: 0,

    rejectedLeave: 0,
    rejectedOvertime: 0,
    rejectedJobRequisition: 0,
    rejectedTrainingRequest: 0,

    pendingLeavePercent: 0,
    pendingOvertimePercent: 0,
    pendingJobRequisitionPercent: 0,
    pendingTrainingRequestPercent: 0,
  }

  for (const form of forms) {
    const status = String(form.status).toUpperCase()
    const type = String(form.type).toLowerCase()

    switch (status) {
      case "PENDING":
        stats.pending++
        break
      case "APPROVED":
        stats.approved++
        break
      case "REJECTED":
        stats.rejected++
        break
    }

    switch (type) {
      case "leave":
        stats.totalLeave++

        if (status === "PENDING") stats.pendingLeave++
        if (status === "APPROVED") stats.approvedLeave++
        if (status === "REJECTED") stats.rejectedLeave++
        break

      case "overtime":
        stats.totalOvertime++

        if (status === "PENDING") stats.pendingOvertime++
        if (status === "APPROVED") stats.approvedOvertime++
        if (status === "REJECTED") stats.rejectedOvertime++
        break

      case "job-requisition":
        stats.totalJobRequisition++

        if (status === "PENDING") stats.pendingJobRequisition++
        if (status === "APPROVED") stats.approvedJobRequisition++
        if (status === "REJECTED") stats.rejectedJobRequisition++
        break

      case "training-request":
        stats.totalTrainingRequest++

        if (status === "PENDING") stats.pendingTrainingRequest++
        if (status === "APPROVED") stats.approvedTrainingRequest++
        if (status === "REJECTED") stats.rejectedTrainingRequest++
        break
    }
  }

  // ==========================
  // PERCENTAGES
  // ==========================

  stats.pendingLeavePercent =
    stats.totalLeave > 0
      ? Math.round((stats.pendingLeave / stats.totalLeave) * 100)
      : 0

  stats.pendingOvertimePercent =
    stats.totalOvertime > 0
      ? Math.round((stats.pendingOvertime / stats.totalOvertime) * 100)
      : 0

  stats.pendingJobRequisitionPercent =
    stats.totalJobRequisition > 0
      ? Math.round(
          (stats.pendingJobRequisition / stats.totalJobRequisition) * 100
        )
      : 0

  stats.pendingTrainingRequestPercent =
    stats.totalTrainingRequest > 0
      ? Math.round(
          (stats.pendingTrainingRequest / stats.totalTrainingRequest) * 100
        )
      : 0

  statsCache.set(cacheKey, stats)

  return NextResponse.json(stats)
}