import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  _req: NextRequest,
  context: any
) {
  const { id } = await context.params
  const year = new Date().getFullYear()

  // 1️⃣ Employee by UNIQUE userId
  const employee = await prisma.employee.findUnique({
    where: { userId: id },
    select: {
      id: true,
      employeeCode: true,
      name: true,
    },
  })

  if (!employee) {
    return NextResponse.json(
      { error: "Employee not found" },
      { status: 404 }
    )
  }

  // 2️⃣ Leave balance by UNIQUE (employeeId, year)
  const leaveBalance = await prisma.leaveBalance.findUnique({
    where: {
      employeeId_year: {
        employeeId: employee.id,
        year,
      },
    },
    select: {
      total: true,
      used: true,
    },
  })

  const total = leaveBalance?.total ?? 0
  const used = leaveBalance?.used ?? 0

  return NextResponse.json({
    employee,
    leave: {
      year,
      total,
      used,
      remaining: Math.max(total - used, 0),
    },
  })
}
