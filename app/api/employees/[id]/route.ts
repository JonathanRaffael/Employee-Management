import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const year = new Date().getFullYear()

  /**
   * 1️⃣ Ambil employee (PK INTERNAL)
   */
  const employee = await prisma.employee.findUnique({
    where: { id },
    select: {
      id: true,
      employeeCode: true,
      name: true,
      department: true,
      position: true,
      isActive: true,
    },
  })

  if (!employee || !employee.isActive) {
    return NextResponse.json(
      { error: "Employee not found or inactive" },
      { status: 404 }
    )
  }

  /**
   * 2️⃣ Ambil leave balance tahun berjalan
   */
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
  const remaining = Math.max(total - used, 0)

  /**
   * 3️⃣ Response final
   */
  return NextResponse.json({
    employee: {
      id: employee.id,
      employeeCode: employee.employeeCode,
      name: employee.name,
      department: employee.department,
      position: employee.position,
    },
    leave: {
      year,
      total,
      used,
      remaining,
    },
  })
}
