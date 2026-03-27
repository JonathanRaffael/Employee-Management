import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const year = new Date().getFullYear()

  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    select: {
      id: true,
      employeeCode: true,
      name: true,
    },
    orderBy: { name: "asc" },
  })

  const leaveBalances = await prisma.leaveBalance.findMany({
    where: {
      year,
      employeeId: { in: employees.map(e => e.id) },
    },
    select: {
      employeeId: true,
      total: true,
      used: true,
    },
  })

  const balanceMap = new Map(
    leaveBalances.map(lb => [lb.employeeId, lb])
  )

  const result = employees.map(e => {
    const balance = balanceMap.get(e.id)
    const total = balance?.total ?? 0
    const used = balance?.used ?? 0

    return {
      id: e.id,
      label: `${e.employeeCode} - ${e.name}`,
      leave: {
        year,
        total,
        used,
        remaining: Math.max(total - used, 0),
      },
    }
  })

  return NextResponse.json(result)
}
