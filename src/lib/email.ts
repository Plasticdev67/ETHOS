import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.office365.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

type EmailOptions = {
  to: string | string[]
  subject: string
  html: string
  attachments?: { filename: string; content: Buffer }[]
}

export async function sendEmail(options: EmailOptions) {
  if (!process.env.SMTP_USER) {
    console.log("[EMAIL] SMTP not configured. Would send:", options.subject, "to", options.to)
    return { sent: false, reason: "SMTP not configured" }
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    })
    return { sent: true }
  } catch (e) {
    console.error("[EMAIL] Failed:", e)
    return { sent: false, reason: String(e) }
  }
}

// Email templates
export function quoteSubmittedEmail(quoteName: string, customerName: string, quoteUrl: string) {
  return {
    subject: `Quote ${quoteName} submitted to ${customerName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e40af; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 20px;">MM Engineered Solutions</h1>
        </div>
        <div style="padding: 24px; background: #f9fafb; border: 1px solid #e5e7eb;">
          <h2 style="color: #111827; margin-top: 0;">Quote Submitted</h2>
          <p style="color: #6b7280;">Quote <strong>${quoteName}</strong> has been submitted to <strong>${customerName}</strong>.</p>
          <a href="${quoteUrl}" style="display: inline-block; background: #1e40af; color: white; padding: 10px 24px; border-radius: 6px; text-decoration: none; margin-top: 12px;">View Quote</a>
        </div>
        <div style="padding: 12px; text-align: center; color: #9ca3af; font-size: 12px;">
          MM Engineered Solutions Ltd
        </div>
      </div>
    `,
  }
}

export function projectOverdueEmail(projectNumber: string, projectName: string, targetDate: string, projectUrl: string) {
  return {
    subject: `Project ${projectNumber} is overdue — ${projectName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 20px;">Overdue Alert</h1>
        </div>
        <div style="padding: 24px; background: #fef2f2; border: 1px solid #fecaca;">
          <h2 style="color: #111827; margin-top: 0;">${projectNumber} — ${projectName}</h2>
          <p style="color: #6b7280;">Target completion was <strong>${targetDate}</strong>. This project is now overdue.</p>
          <a href="${projectUrl}" style="display: inline-block; background: #dc2626; color: white; padding: 10px 24px; border-radius: 6px; text-decoration: none; margin-top: 12px;">View Project</a>
        </div>
        <div style="padding: 12px; text-align: center; color: #9ca3af; font-size: 12px;">
          MM Engineered Solutions Ltd
        </div>
      </div>
    `,
  }
}

export function ncrRaisedEmail(ncrNumber: string, projectNumber: string, title: string, severity: string, ncrUrl: string) {
  return {
    subject: `NCR ${ncrNumber} raised on ${projectNumber} — ${severity}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f59e0b; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 20px;">NCR Alert</h1>
        </div>
        <div style="padding: 24px; background: #fffbeb; border: 1px solid #fde68a;">
          <h2 style="color: #111827; margin-top: 0;">${ncrNumber} — ${title}</h2>
          <p style="color: #6b7280;">Severity: <strong>${severity}</strong> | Project: <strong>${projectNumber}</strong></p>
          <a href="${ncrUrl}" style="display: inline-block; background: #f59e0b; color: white; padding: 10px 24px; border-radius: 6px; text-decoration: none; margin-top: 12px;">View NCR</a>
        </div>
        <div style="padding: 12px; text-align: center; color: #9ca3af; font-size: 12px;">
          MM Engineered Solutions Ltd
        </div>
      </div>
    `,
  }
}

export function retentionDueEmail(projectNumber: string, projectName: string, amount: string, releaseDate: string) {
  return {
    subject: `Retention release due — ${projectNumber} ${projectName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #059669; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 20px;">Retention Release Due</h1>
        </div>
        <div style="padding: 24px; background: #ecfdf5; border: 1px solid #a7f3d0;">
          <h2 style="color: #111827; margin-top: 0;">${projectNumber} — ${projectName}</h2>
          <p style="color: #6b7280;">Retention of <strong>${amount}</strong> is due for release on <strong>${releaseDate}</strong>.</p>
        </div>
        <div style="padding: 12px; text-align: center; color: #9ca3af; font-size: 12px;">
          MM Engineered Solutions Ltd
        </div>
      </div>
    `,
  }
}
