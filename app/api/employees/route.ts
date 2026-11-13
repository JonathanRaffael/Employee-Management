
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const query = searchParams.get("q")?.trim() || ""
    const dept = searchParams.get("dept") || ""

    // Default tetap Active untuk kompatibilitas API lama.
    const requestedStatus = searchParams.get("status") || "active"

    const year = new Date().getFullYear()

    // Pagination
    const paginationRequested =
      searchParams.has("page") || searchParams.has("limit")

    const page = Math.max(
      1,
      Number.parseInt(searchParams.get("page") || "1", 10) || 1
    )

    const limit = Math.min(
      100,
      Math.max(
        1,
        Number.parseInt(searchParams.get("limit") || "10", 10) || 10
      )
    )

    // Filter pencarian dan department
    const baseWhere = {
      ...(query
        ? {
            OR: [
              {
                name: {
                  contains: query,
                  mode: "insensitive" as const,
                },
              },
              {
                employeeCode: {
                  contains: query,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
      ...(dept ? { department: dept } : {}),
    }

    // Filter status
    const statusWhere =
      requestedStatus === "all"
        ? {}
        : requestedStatus === "inactive"
          ? { isActive: false }
          : { isActive: true }

    const where = {
      ...baseWhere,
      ...statusWhere,
    }

    // Ambil data employee dan jumlah berdasarkan status.
    const [employees, total, activeCount, inactiveCount, departments] =
      await Promise.all([
        prisma.employee.findMany({
          where,
          select: {
            id: true,
            employeeCode: true,
            name: true,
            department: true,
            position: true,
            isActive: true,
            createdAt: true,
          },
          orderBy: {
            name: "asc",
          },
          ...(paginationRequested
            ? {
                skip: (page - 1) * limit,
                take: limit,
              }
            : {}),
        }),

        prisma.employee.count({
          where,
        }),

        prisma.employee.count({
          where: {
            ...baseWhere,
            isActive: true,
          },
        }),

        prisma.employee.count({
          where: {
            ...baseWhere,
            isActive: false,
          },
        }),

        prisma.employee.findMany({
          where: baseWhere,
          select: {
            department: true,
          },
          distinct: ["department"],
          orderBy: {
            department: "asc",
          },
        }),
      ])

    // Ambil saldo cuti tahun berjalan
    const leaveBalances =
      employees.length > 0
        ? await prisma.leaveBalance.findMany({
            where: {
              year,
              employeeId: {
                in: employees.map((employee) => employee.id),
              },
            },
            select: {
              employeeId: true,
              total: true,
              used: true,
            },
          })
        : []

    const balanceMap = new Map(
      leaveBalances.map((balance) => [
        balance.employeeId,
        balance,
      ])
    )

    // Gabungkan employee dengan saldo cuti
    const result = employees.map((employee) => {
      const balance = balanceMap.get(employee.id)

      const totalLeave = Number(balance?.total ?? 0)
      const usedLeave = Number(balance?.used ?? 0)

      return {
        id: employee.id,
        employeeCode: employee.employeeCode,
        name: employee.name,
        department: employee.department,
        position: employee.position,

        // Penting: status dikirim ke frontend.
        isActive: employee.isActive,

        createdAt: employee.createdAt,

        leave: {
          year,
          total: totalLeave,
          used: usedLeave,
          remaining: Math.max(totalLeave - usedLeave, 0),
        },
      }
    })

    // Jika dipanggil API lama tanpa pagination,
    // tetap kembalikan array agar kompatibel.
    if (!paginationRequested) {
      return NextResponse.json(result)
    }

    // Response khusus Employee Management.
    return NextResponse.json({
      employees: result,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      activeCount,
      inactiveCount,
      departments: departments.map((item) => item.department),
    })
  } catch (error) {
    console.error("Error fetching employees:", error)

    return NextResponse.json(
      {
        error: "Failed to fetch employees",
      },
      {
        status: 500,
      }
    )
  }
}
