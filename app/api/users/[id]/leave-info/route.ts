
import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const year = new Date().getFullYear()

  // 1. Employee by UNIQUE userId
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

  // 2. Leave balance by UNIQUE (employeeId, year)
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

  // 3. Convert Prisma.Decimal to number
  const total = Number(leaveBalance?.total ?? 0)
  const used = Number(leaveBalance?.used ?? 0)
  const remaining = Math.max(total - used, 0)

  // 4. Response
  return NextResponse.json({
    employee,
    leave: {
      year,
      total,
      used,
      remaining,
    },
  })
}
