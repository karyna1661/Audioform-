import { type NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"

// Create a test account using Ethereal Email for development
// In production, you would use your own SMTP credentials
async function createTransporter() {
  // If SMTP credentials are provided, use them
  if (process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number.parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    })
  }

  // Otherwise, create a test account for development
  const testAccount = await nodemailer.createTestAccount()

  return nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const { to, subject, html, text } = await request.json()

    if (!to || !subject || (!html && !text)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create transporter
    const transporter = await createTransporter()

    // Send email
    const info = await transporter.sendMail({
      from: '"AudioForm" <notifications@audioform.example.com>',
      to: Array.isArray(to) ? to.join(", ") : to,
      subject,
      text,
      html,
    })

    // For development with Ethereal, provide the preview URL
    let previewUrl = null
    if (info.messageId && info.envelope && !process.env.SMTP_HOST) {
      previewUrl = nodemailer.getTestMessageUrl(info)
      console.log("Email preview URL:", previewUrl)
    }

    return NextResponse.json({
      success: true,
      messageId: info.messageId,
      previewUrl,
    })
  } catch (error: any) {
    console.error("Error sending email:", error)

    return NextResponse.json(
      {
        error: "Failed to send email",
        details: error.message,
      },
      { status: 500 },
    )
  }
}
