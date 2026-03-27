import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q") || ""
    const dept = searchParams.get("dept") || ""

    const year = new Date().getFullYear()

    /**
     * 1️⃣ Ambil employee aktif
     */
    const employees = await prisma.employee.findMany({
      where: {
        isActive: true,
        ...(query && {
          name: {
            contains: query,
            mode: "insensitive",
          },
        }),
        ...(dept && { department: dept }),
      },
      select: {
        id: true,
        employeeCode: true,
        name: true,
        department: true,
        position: true,
      },
      orderBy: { name: "asc" },
    })

    if (employees.length === 0) {
      return NextResponse.json([])
    }

    /**
     * 2️⃣ Ambil leave balance tahun berjalan (UNIK & TERPISAH)
     */
    const leaveBalances = await prisma.leaveBalance.findMany({
      where: {
        year,
        employeeId: {
          in: employees.map((e) => e.id),
        },
      },
      select: {
        employeeId: true,
        total: true,
        used: true,
      },
    })

    const balanceMap = new Map(
      leaveBalances.map((b) => [b.employeeId, b])
    )

    /**
     * 3️⃣ Gabungkan hasil
     */
    const result = employees.map((e) => {
      const balance = balanceMap.get(e.id)
      const total = balance?.total ?? 0
      const used = balance?.used ?? 0

      return {
        id: e.id,
        employeeCode: e.employeeCode,
        name: e.name,
        department: e.department,
        position: e.position,
        leave: {
          year,
          total,
          used,
          remaining: Math.max(total - used, 0),
        },
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching employees:", error)
    return NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 }
    )
  }
}
