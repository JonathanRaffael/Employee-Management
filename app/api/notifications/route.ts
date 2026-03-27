import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const ALLOWED_SENDER_ROLES = ["leader", "hrd", "admin"]

/* =========================
   GET: Notifications (User)
========================= */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const limit = Math.min(Number(searchParams.get("limit")) || 30, 100)

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  return NextResponse.json(notifications)
}

/* =========================
   POST: Create Notifications
   (Leader / HRD / Admin)
========================= */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || !ALLOWED_SENDER_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { title, message, receiverIds } = await req.json()

  if (!title || !Array.isArray(receiverIds) || receiverIds.length === 0) {
    return NextResponse.json(
      { error: "Title & receiverIds[] are required" },
      { status: 400 }
    )
  }

  // 🔒 pastikan semua receiver valid
  const validUsers = await prisma.user.findMany({
    where: { id: { in: receiverIds } },
    select: { id: true },
  })

  if (validUsers.length === 0) {
    return NextResponse.json(
      { error: "No valid receivers found" },
      { status: 400 }
    )
  }

  const data = validUsers.map((u) => ({
    title,
    message,
    userId: u.id,
  }))

  await prisma.notification.createMany({ data })

  return NextResponse.json({
    success: true,
    sent: data.length,
  })
}

/* =========================
   PATCH: Mark as Read
========================= */
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await req.json()

  if (!id) {
    return NextResponse.json(
      { error: "Notification ID is required" },
      { status: 400 }
    )
  }

  const updated = await prisma.notification.updateMany({
    where: {
      id,
      userId: session.user.id,
      isRead: false,
    },
    data: { isRead: true },
  })

  if (updated.count === 0) {
    return NextResponse.json(
      { error: "Notification not found or already read" },
      { status: 404 }
    )
  }

  return NextResponse.json({ success: true })
}
