import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "leader") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const data = await request.json()

    // Create form
    const form = await prisma.form.create({
      data: {
        type: data.type,
        status: "pending",
        data: data.formData,
        employeeId: session.user.id, // This is the leader's ID
        employeeSignature: data.signature,
        supportingDocuments: data.supportingDocuments || [],
        approvals: {
          create: [
            {
              role: "leader",
              status: "approved",
              approverId: session.user.id,
              signature: data.signature,
            },
            {
              role: "hrd",
              status: "pending",
            },
          ],
        },
      },
    })

    return NextResponse.json({ success: true, formId: form.id })
  } catch (error) {
    console.error("Error creating form:", error)
    return NextResponse.json({ error: "Failed to create form" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  const type = searchParams.get("type")

  try {
    const whereClause: any = {}

    // Filter by user role
    if (session.user.role === "leader") {
      whereClause.employeeId = session.user.id
    }

    // Filter by status if provided
    if (status) {
      whereClause.status = status
    }

    // Filter by type if provided
    if (type) {
      whereClause.type = type
    }

    const forms = await prisma.form.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            employeeId: true,
            department: true,
            position: true,
          },
        },
        approvals: {
          include: {
            approver: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(forms)
  } catch (error) {
    console.error("Error fetching forms:", error)
    return NextResponse.json({ error: "Failed to fetch forms" }, { status: 500 })
  }
}
