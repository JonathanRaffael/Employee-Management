import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/* =========================
   TYPES
========================= */
interface SessionUser {
  id: string
  role?: string | null
  department?: string | null
}

interface CustomSession {
  user: SessionUser
}

/* =========================
   SIMPLE IN-MEMORY CACHE
========================= */
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
    this.cache.set(key, { data, timestamp: Date.now() })
  }
}

const statsCache = new UltraFastCache()

/* =========================
   GET STATS
========================= */
export async function GET() {
  const startTime = performance.now()

  const session = (await getServerSession(
    authOptions
  )) as CustomSession | null

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = (session.user.role ?? "").toLowerCase()

  if (!["admin", "hrd", "leader", "supervisor"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const cacheKey = `stats:${role}:${session.user.id}`

  const cached = statsCache.get(cacheKey)
  if (cached) {
    const res = NextResponse.json(cached)
    res.headers.set("X-Cache", "HIT")
    return res
  }

  try {
    /* =========================
       ROLE FILTER
    ========================= */
    const formWhere: any = {}

    // Leader → hanya department sendiri
    if (role === "leader") {
      if (!session.user.department) {
        return NextResponse.json(
          { error: "Leader has no department" },
          { status: 400 }
        )
      }

      formWhere.employee = {
        department: session.user.department,
      }
    }

    // Supervisor → hanya overtime
    if (role === "supervisor") {
      formWhere.type = "overtime"
    }

    /* =========================
       TOTAL COUNT
    ========================= */
    const total = await prisma.form.count({
      where: formWhere,
    })

    /* =========================
       STATUS AGGREGATION
       ✅ HITUNG DARI FORM
       (Single Query Fast)
    ========================= */
    const grouped = await prisma.form.groupBy({
      by: ["status"],
      where: formWhere,
      _count: {
        status: true,
      },
    })

    const statsMap: Record<string, number> = {
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
    }

    grouped.forEach((g) => {
      statsMap[g.status] = g._count.status
    })

    const stats = {
      total,
      pending: statsMap.PENDING,
      approved: statsMap.APPROVED,
      rejected: statsMap.REJECTED,
    }

    /* =========================
       CACHE SAVE
    ========================= */
    statsCache.set(cacheKey, stats)

    const res = NextResponse.json(stats)

    res.headers.set(
      "X-Query-Time",
      `${(performance.now() - startTime).toFixed(2)}ms`
    )
    res.headers.set("X-Cache", "MISS")

    return res
  } catch (error) {
    console.error("[STATS ERROR]", error)

    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    )
  }
}