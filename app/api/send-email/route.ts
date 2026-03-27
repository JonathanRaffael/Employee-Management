import { NextResponse } from "next/server"
import nodemailer from "nodemailer"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

/* ======================
   TYPES
====================== */
interface EmailRequest {
  to: string | string[]
  subject: string
  html: string
  cc?: string | string[]
  bcc?: string | string[]
}

const ALLOWED_ROLES = ["admin", "hrd", "leader"]

/* ======================
   TRANSPORTER (SINGLETON)
====================== */
let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      throw new Error("SMTP credentials not configured")
    }

    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    })
  }
  return transporter
}

/* ======================
   EMAIL VALIDATION
====================== */
function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

function normalizeEmails(input: string | string[]): string[] {
  const list =
    typeof input === "string"
      ? input.split(",").map((e) => e.trim())
      : input

  const valid = list.filter(isValidEmail)
  if (!valid.length) throw new Error("No valid email recipients")
  return valid
}

/* ======================
   BASIC HTML GUARD
====================== */
function isSafeHtml(html: string) {
  return !/<script|onerror=|onload=|javascript:/i.test(html)
}

/* ======================
   POST – SEND EMAIL
====================== */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (
    !session?.user?.id ||
    !ALLOWED_ROLES.includes(session.user.role)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { to, subject, html, cc, bcc }: EmailRequest = await req.json()

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: "to, subject, and html are required" },
        { status: 400 }
      )
    }

    if (!isSafeHtml(html)) {
      return NextResponse.json(
        { error: "Unsafe HTML content detected" },
        { status: 400 }
      )
    }

    const toList = normalizeEmails(to)
    const ccList = cc ? normalizeEmails(cc) : undefined
    const bccList = bcc ? normalizeEmails(bcc) : undefined

    const mailOptions: nodemailer.SendMailOptions = {
      from: `PT. Hang Tong Manufactory <${process.env.SMTP_USER}>`,
      to: toList,
      subject,
      html,
      ...(ccList && { cc: ccList }),
      ...(bccList && { bcc: bccList }),
      headers: {
        "X-Mailer": "HTMF HR System",
      },
    }

    const info = await getTransporter().sendMail(mailOptions)

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      sent: toList.length,
    })
  } catch (error) {
    console.error("[EMAIL ERROR]", error)
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    )
  }
}

/* ======================
   GET – SMTP HEALTH
   (ADMIN ONLY)
====================== */
export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    await getTransporter().verify()
    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
