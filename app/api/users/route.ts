import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hash } from "bcryptjs"

interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: string;
}

interface CustomSession {
  user: SessionUser;
}

// 🔹 GET: Ambil semua user (khusus admin)
export async function GET(request: Request) {
  const session = await getServerSession(authOptions) as CustomSession | null
  const url = new URL(request.url)
  const role = url.searchParams.get("role")
  const department = url.searchParams.get("department")

  // Allow leaders to fetch employee data for leave management
  if (!session || (session.user.role !== "admin" && session.user.role !== "leader" && session.user.role !== "hrd")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Build the where clause based on query parameters
    const whereClause: any = {}
    
    // If role is specified, filter by role
    if (role) {
      whereClause.role = role
    }
    
    // If department is specified, filter by department
    if (department) {
      whereClause.department = department
    }
    
    // If the requester is a leader, only show employees (not other leaders/admins)
    // unless they're specifically requesting all users
    if (session.user.role === "leader" && !role) {
      whereClause.role = "employee"
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        employeeId: true,
        department: true,
        position: true,
        jatahcuti: true,
        cutiterpakai: true,
      },
      orderBy: {
        name: 'asc'
      }
    })

    const usersWithSisaCuti = users.map(user => ({
      ...user,
      sisaCuti: user.jatahcuti - user.cutiterpakai,
    }))

    return NextResponse.json(usersWithSisaCuti)
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

// 🔹 POST: Tambah user baru (khusus admin)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions) as CustomSession | null

  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const data = await request.json()
    const { name, email, password, role, employeeId, department, position, jatahcuti } = data

    // Updated to allow "employee" role for regular staff members
    const allowedRoles = ["leader", "hrd", "admin", "pmc", "employee"]
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    if (jatahcuti !== undefined && (isNaN(jatahcuti) || jatahcuti < 0)) {
      return NextResponse.json({ error: "Invalid jatah cuti" }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })

    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 400 })
    }

    const hashedPassword = await hash(password, 10)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        employeeId,
        department,
        position,
        jatahcuti: jatahcuti ?? 12,
        cutiterpakai: 0,
      },
    })

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
      department: user.department,
      position: user.position,
      jatahcuti: user.jatahcuti,
      cutiterpakai: user.cutiterpakai,
      sisaCuti: user.jatahcuti - user.cutiterpakai
    })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}

// 🔹 PATCH: Update cuti terpakai (khusus admin)
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions) as CustomSession | null

  // Allow leaders and HRD to update leave balances
  if (!session || (session.user.role !== "admin" && session.user.role !== "leader" && session.user.role !== "hrd")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { userId, cutiBaru, action, jatahcutiBaru } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Get the current user data
    const currentUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const updateData: any = {}

    // Handle different update actions
    if (action === "increment" && typeof cutiBaru === "number" && cutiBaru > 0) {
      // Increment used leave
      updateData.cutiterpakai = {
        increment: cutiBaru
      }
    } else if (action === "decrement" && typeof cutiBaru === "number" && cutiBaru > 0) {
      // Decrement used leave (for cancellations)
      const newValue = Math.max(0, currentUser.cutiterpakai - cutiBaru)
      updateData.cutiterpakai = newValue
    } else if (action === "reset") {
      // Reset used leave (e.g., for annual reset)
      updateData.cutiterpakai = 0
    } else if (action === "setJatahCuti" && typeof jatahcutiBaru === "number" && jatahcutiBaru >= 0) {
      // Update total leave allowance
      updateData.jatahcuti = jatahcutiBaru
    } else if (action === "set" && typeof cutiBaru === "number" && cutiBaru >= 0) {
      // Set used leave to a specific value
      updateData.cutiterpakai = cutiBaru
    } else {
      return NextResponse.json({ error: "Invalid action or leave value" }, { status: 400 })
    }

    // Update the user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData
    })

    return NextResponse.json({
      message: "User updated successfully",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        jatahcuti: updatedUser.jatahcuti,
        cutiterpakai: updatedUser.cutiterpakai,
        sisaCuti: updatedUser.jatahcuti - updatedUser.cutiterpakai,
      },
    })
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}

// 🔹 DELETE: Hapus user (khusus admin)
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions) as CustomSession | null

  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const url = new URL(request.url)
    const userId = url.searchParams.get("id")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Delete the user
    await prisma.user.delete({
      where: { id: userId }
    })

    return NextResponse.json({
      message: "User deleted successfully"
    })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
  }
}