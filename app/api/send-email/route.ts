import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

// Konfigurasi transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true", // false untuk port 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// POST handler
export async function POST(request: Request) {
  try {
    const { to, subject, html } = await request.json();

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, or html" },
        { status: 400 }
      );
    }

    // Konversi string to menjadi array jika perlu
    const recipientList =
      typeof to === "string" ? to.split(",").map(email => email.trim()) : to;

    const fromName = "PT. Hang Tong Manufactory";
    const fromEmail = process.env.SMTP_USER || "hrteam.hangtong@gmail.com";
    const from = `${fromName} <${fromEmail}>`;

    const mailOptions = {
      from,
      to: recipientList, // bisa array atau string
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent: ${info.messageId}`);

    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      {
        error: "Failed to send email",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
