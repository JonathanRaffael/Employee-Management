
import { NextResponse, type NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

type RouteContext = {
  params: Promise<{ id: string }>
}

type EmployeePatchBody = {
  employeeCode?: string
  name?: string
  department?: string
  position?: string
  isActive?: boolean
  leave?: {
    year?: number
    total?: number
    used?: number
  }
}

const employeeSelect = {
  id: true,
  employeeCode: true,
  name: true,
  department: true,
  position: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

// GET EMPLOYEE DETAIL + LEAVE BALANCE
export async function GET(
  _req: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const year = new Date().getFullYear()

    const employee = await prisma.employee.findUnique({
      where: { id },
      select: employeeSelect,
    })

    if (!employee) {
      return errorResponse("Employee not found", 404)
    }

    const leaveBalance = await prisma.leaveBalance.findUnique({
      where: {
        employeeId_year: {
          employeeId: id,
          year,
        },
      },
    })

    const total = Number(leaveBalance?.total ?? 0)
    const used = Number(leaveBalance?.used ?? 0)

    return NextResponse.json({
      employee,
      leave: {
        year,
        total,
        used,
        remaining: total - used,
      },
    })
  } catch (error) {
    console.error("[GET EMPLOYEE]", error)

    return errorResponse(
      "Failed to retrieve employee information",
      500
    )
  }
}

// PATCH EMPLOYEE + LEAVE BALANCE + STATUS
export async function PATCH(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params

    const body = (await req.json()) as EmployeePatchBody

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return errorResponse("Invalid request body", 400)
    }

    // Check employee existence
    const existingEmployee = await prisma.employee.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!existingEmployee) {
      return errorResponse("Employee not found", 404)
    }

    // Validate employee fields
    const employeeData: {
      employeeCode?: string
      name?: string
      department?: string
      position?: string
      isActive?: boolean
    } = {}

    for (const field of [
      "employeeCode",
      "name",
      "department",
      "position",
    ] as const) {
      if (body[field] !== undefined) {
        if (typeof body[field] !== "string") {
          return errorResponse(`${field} must be a string`, 400)
        }

        const value = body[field].trim()

        if (
          (field === "employeeCode" || field === "name") &&
          !value
        ) {
          return errorResponse(`${field} cannot be empty`, 400)
        }

        employeeData[field] = value
      }
    }

    if (body.isActive !== undefined) {
      if (typeof body.isActive !== "boolean") {
        return errorResponse("isActive must be a boolean", 400)
      }

      employeeData.isActive = body.isActive
    }

    // Validate leave payload
    let leaveInput: {
      year: number
      total: number
      used: number
    } | null = null

    if (body.leave !== undefined) {
      if (
        !body.leave ||
        typeof body.leave !== "object" ||
        Array.isArray(body.leave)
      ) {
        return errorResponse("Invalid leave data", 400)
      }

      const { year, total, used } = body.leave

      const targetYear = year ?? new Date().getFullYear()

      if (
        !Number.isInteger(targetYear) ||
        targetYear < 2000 ||
        targetYear > 2100
      ) {
        return errorResponse("Invalid leave year", 400)
      }

      const existingBalance = await prisma.leaveBalance.findUnique({
        where: {
          employeeId_year: {
            employeeId: id,
            year: targetYear,
          },
        },
      })

      const nextTotal =
        total !== undefined
          ? total
          : Number(existingBalance?.total ?? 0)

      const nextUsed =
        used !== undefined
          ? used
          : Number(existingBalance?.used ?? 0)

      if (
        !Number.isInteger(nextTotal) ||
        !Number.isInteger(nextUsed)
      ) {
        return errorResponse(
          "Leave total and used must be whole numbers",
          400
        )
      }

      if (nextTotal < 0 || nextUsed < 0) {
        return errorResponse(
          "Leave values cannot be negative",
          400
        )
      }

      if (nextUsed > nextTotal) {
        return errorResponse(
          "Used leave cannot exceed total leave",
          400
        )
      }

      leaveInput = {
        year: targetYear,
        total: nextTotal,
        used: nextUsed,
      }
    }

    if (
      Object.keys(employeeData).length === 0 &&
      leaveInput === null
    ) {
      return errorResponse("No data provided to update", 400)
    }

    // Atomic database update
    const result = await prisma.$transaction(async (tx) => {
      const employee =
        Object.keys(employeeData).length > 0
          ? await tx.employee.update({
              where: { id },
              data: employeeData,
              select: employeeSelect,
            })
          : await tx.employee.findUniqueOrThrow({
              where: { id },
              select: employeeSelect,
            })

      let leave = null

      if (leaveInput) {
        const balance = await tx.leaveBalance.upsert({
          where: {
            employeeId_year: {
              employeeId: id,
              year: leaveInput.year,
            },
          },
          create: {
            employeeId: id,
            year: leaveInput.year,
            total: leaveInput.total,
            used: leaveInput.used,
          },
          update: {
            total: leaveInput.total,
            used: leaveInput.used,
          },
        })

        const total = Number(balance.total)
        const used = Number(balance.used)

        leave = {
          year: balance.year,
          total,
          used,
          remaining: total - used,
        }
      }

      return { employee, leave }
    })

    return NextResponse.json({
      success: true,
      message: "Employee updated successfully",
      employee: result.employee,
      ...(result.leave && { leave: result.leave }),
    })
  } catch (error) {
    console.error("[PATCH EMPLOYEE]", error)

    return errorResponse(
      "Failed to update employee information",
      500
    )
  }
}
