import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hash } from "bcryptjs"

interface SessionUser {
  id: string
  role: string
}

interface CustomSession {
  user: SessionUser
}

// 🔒 ROLE SYSTEM (UPPERCASE – SINGLE SOURCE OF TRUTH)
const ADMIN_ROLE = "ADMIN"
const ALLOWED_CREATE_ROLES = ["ADMIN", "HRD", "LEADER"]

/* =====================
   GET USERS (ADMIN ONLY)
===================== */
export async function GET() {
  const session = (await getServerSession(authOptions)) as CustomSession | null

  if (!session || session.user.role !== ADMIN_ROLE) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  })

  return NextResponse.json(users)
}

/* =====================
   CREATE USER (ADMIN)
===================== */
export async function POST(request: Request) {
  const session = (await getServerSession(authOptions)) as CustomSession | null

  if (!session || session.user.role !== ADMIN_ROLE) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { name, email, password, role } = await request.json()

  if (!name || !email || !password || !role) {
    return NextResponse.json(
      { error: "Name, email, password, and role are required" },
      { status: 400 }
    )
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    )
  }

  if (!ALLOWED_CREATE_ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 })
  }

  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) {
    return NextResponse.json({ error: "Email already used" }, { status: 409 })
  }

  const hashedPassword = await hash(password, 10)

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role, // sudah uppercase
    },
  })

  return NextResponse.json(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    { status: 201 }
  )
}

/* =====================
   DELETE USER (ADMIN)
===================== */
export async function DELETE(request: Request) {
  const session = (await getServerSession(authOptions)) as CustomSession | null

  if (!session || session.user.role !== ADMIN_ROLE) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("id")

  if (!userId) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 })
  }

  // 🔒 admin tidak boleh hapus dirinya sendiri
  if (userId === session.user.id) {
    return NextResponse.json(
      { error: "Admin cannot delete their own account" },
      { status: 400 }
    )
  }

  // 🔎 CEK RELASI EMPLOYEE (BUKAN FORM LANGSUNG)
  const employee = await prisma.employee.findUnique({
    where: { userId },
    select: { id: true },
  })

  if (employee) {
    const formCount = await prisma.form.count({
      where: { employeeId: employee.id },
    })

    if (formCount > 0) {
      return NextResponse.json(
        { error: "User has related forms and cannot be deleted" },
        { status: 409 }
      )
    }
  }

  await prisma.user.delete({
    where: { id: userId },
  })

  return NextResponse.json({ message: "User deleted" })
}
