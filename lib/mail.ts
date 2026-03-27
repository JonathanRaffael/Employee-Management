// lib/mail.ts
import nodemailer from "nodemailer"
import type Mail from "nodemailer/lib/mailer"

interface SendMailOptions {
  to: string | string[]
  subject: string
  html: string
  // Optional attachments, mengikuti tipe Nodemailer
  attachments?: Mail.Attachment[]
}

// Singleton transporter
let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (!transporter) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      throw new Error("SMTP credentials not configured")
    }

    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true", // false for port 587
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

// Simple in-memory rate limiter
const emailRateLimit = new Map<string, number[]>()
const MAX_EMAILS_PER_MINUTE = 10
const ONE_MINUTE = 60 * 1000

function isRateLimited(identifier: string): boolean {
  const now = Date.now()
  const timestamps = emailRateLimit.get(identifier) || []
  const recent = timestamps.filter((time) => now - time < ONE_MINUTE)

  recent.push(now)
  emailRateLimit.set(identifier, recent)

  return recent.length > MAX_EMAILS_PER_MINUTE
}

export async function sendMail({ to, subject, html, attachments }: SendMailOptions) {
  try {
    // Server-side send
    if (typeof window === "undefined") {
      const identifier = Array.isArray(to) ? to[0] : to
      if (isRateLimited(identifier)) {
        return { success: false, error: "Rate limit exceeded" }
      }

      const fromName = "PT. Hang Tong Manufactory"
      const fromEmail = process.env.SMTP_USER || "hrteam.hangtong@gmail.com"

      const recipientList = typeof to === "string" ? to.split(",").map((e) => e.trim()) : to

      const info = await getTransporter().sendMail({
        from: `${fromName} <${fromEmail}>`,
        to: recipientList,
        subject,
        html,
        // attachments tetap boleh undefined
        attachments,
      })

      console.log(`Email sent to ${recipientList.join(", ")} - ID: ${info.messageId}`)
      return { success: true, messageId: info.messageId }
    }

    // Client-side: fallback ke API route
    // ⚠️ Attachments tidak dikirim via client-side di sini karena masalah serialisasi
    const res = await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, html }),
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      throw new Error(errorData.error || "Failed to send email")
    }

    const data = await res.json()
    return { success: true, messageId: data.messageId }
  } catch (error) {
    console.error("Error sending email:", error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function sendMailDirect({ to, subject, html, attachments }: SendMailOptions) {
  try {
    console.log("Mock direct email:", {
      to,
      subject,
      preview: html.slice(0, 100) + "...",
      hasAttachments: !!attachments && attachments.length > 0,
    })
    return { success: true, messageId: `mock-${Date.now()}` }
  } catch (error) {
    console.error("Error sending direct email:", error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}
