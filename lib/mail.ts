// Server-side email sending function with proper URL handling
export async function sendMail({ to, subject, html }: { to: string | string[]; subject: string; html: string }) {
  try {
    // Check if we're running on the server
    if (typeof window === "undefined") {
      // Server-side: use absolute URL
      const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || "http://localhost:3000"
      const response = await fetch(`${baseUrl}/api/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ to, subject, html }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log(`Email sent successfully to ${to}`)
      return { success: true, messageId: data.messageId }
    } else {
      // Client-side: use relative URL
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ to, subject, html }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || "Failed to send email")
      }

      const data = await response.json()
      return { success: true, messageId: data.messageId }
    }
  } catch (error) {
    console.error("Error sending email:", error)
    return { success: false, error }
  }
}

// Alternative direct email sending function (bypasses API route)
export async function sendMailDirect({ to, subject, html }: { to: string; subject: string; html: string }) {
  try {
    // This would be used if you want to send emails directly without going through the API route
    // Example with Resend:
    /*
    import { Resend } from 'resend'
    
    const resend = new Resend(process.env.RESEND_API_KEY)
    
    const result = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'noreply@hangtong.com',
      to,
      subject,
      html,
    })
    
    console.log(`Direct email sent successfully to ${to}`)
    return { success: true, messageId: result.data?.id }
    */

    // For now, just log the email (replace with actual email service)
    console.log("Email would be sent:", { to, subject, html: html.substring(0, 100) + "..." })
    return { success: true, messageId: `mock-${Date.now()}` }
  } catch (error) {
    console.error("Error sending direct email:", error)
    return { success: false, error }
  }
}
