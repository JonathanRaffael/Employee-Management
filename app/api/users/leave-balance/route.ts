// app/api/users/leave-balance/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface SessionUser {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
  role: string
}

interface CustomSession {
  user: SessionUser
}

export async function PATCH(request: Request) {
  const session = (await getServerSession(authOptions)) as CustomSession | null

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const data = await request.json()
    const { userId, leaveAmount, formId, action = "increment" } = data

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    if (leaveAmount === undefined || leaveAmount === null) {
      return NextResponse.json({ error: "Leave amount is required" }, { status: 400 })
    }

    // Verify the user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Update the user's leave balance based on the action
    let updateData = {};
    
    if (action === "increment") {
      updateData = {
        cutiterpakai: {
          increment: leaveAmount,
        },
      };
    } else if (action === "decrement") {
      // Ensure we don't go below zero
      const newValue = Math.max(0, (user.cutiterpakai || 0) - leaveAmount);
      updateData = {
        cutiterpakai: newValue,
      };
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    })

    // If a form ID was provided, update the form's data field to track that the leave balance was updated
    if (formId) {
      const form = await prisma.form.findUnique({
        where: { id: formId },
      });
      
      if (form) {
        // Get the current data
        const formData = typeof form.data === 'string' ? JSON.parse(form.data) : form.data;
        
        // Update the data to include leaveBalanceUpdated flag
        const updatedData = {
          ...formData,
          leaveBalanceUpdated: true,
          leaveBalanceUpdatedAt: new Date().toISOString(),
          leaveBalanceUpdatedBy: session.user.id,
        };
        
        await prisma.form.update({
          where: { id: formId },
          data: {
            data: updatedData,
          },
        });
      }
    }

    // Calculate remaining leave
    const sisaCuti = (updatedUser.jatahcuti || 0) - (updatedUser.cutiterpakai || 0)

    return NextResponse.json({
      success: true,
      message: `Leave balance updated successfully`,
      user: {
        ...updatedUser,
        sisaCuti,
      },
    })
  } catch (error) {
    console.error("Error updating leave balance:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to update leave balance"
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}