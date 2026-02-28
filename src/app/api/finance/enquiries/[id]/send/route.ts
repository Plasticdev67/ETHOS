import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Fetch the full enquiry with lines and responses
  const enquiry = await prisma.procurementEnquiry.findUnique({
    where: { id },
    include: {
      project: { select: { projectNumber: true, name: true } },
      lines: { orderBy: { sortOrder: "asc" } },
      responses: {
        include: {
          supplier: { select: { id: true, name: true, email: true } },
        },
      },
    },
  })

  if (!enquiry) {
    return NextResponse.json({ error: "Enquiry not found" }, { status: 404 })
  }

  if (enquiry.status !== "DRAFT" && enquiry.status !== "SENT") {
    return NextResponse.json(
      { error: "Enquiry cannot be sent in its current status" },
      { status: 400 }
    )
  }

  // Mark enquiry as SENT
  await prisma.procurementEnquiry.update({
    where: { id },
    data: {
      status: "SENT",
      sentAt: new Date(),
    },
  })

  // Update all responses with emailSentAt
  await prisma.enquiryResponse.updateMany({
    where: { enquiryId: id, status: "PENDING" },
    data: { emailSentAt: new Date() },
  })

  // Generate email content per supplier
  const emails = enquiry.responses.map((response) => {
    const supplier = response.supplier

    // Build the items table rows
    const tableRows = enquiry.lines
      .map(
        (line, idx) =>
          `| ${idx + 1} | ${line.description} | ${line.partNumber || "—"} | ${Number(line.quantity)} | ${line.unit} |`
      )
      .join("\n")

    const subject = `Request for Quotation: ${enquiry.enquiryNumber} — ${enquiry.subject}`

    const body = `Dear ${supplier.name},

We are writing to request a quotation for the following items in connection with our project ${enquiry.project.projectNumber} — ${enquiry.project.name}.

Enquiry Reference: ${enquiry.enquiryNumber}
Project: ${enquiry.project.projectNumber} — ${enquiry.project.name}

ITEMS REQUIRED:

| # | Description | Part No. | Qty | Unit |
|---|-------------|----------|-----|------|
${tableRows}

${enquiry.notes ? `Additional Notes:\n${enquiry.notes}\n` : ""}Please provide:
- Unit price and total price for each item
- Lead time (working days) for each item
- Quotation validity period
- Any applicable terms and conditions

Please return your quotation at your earliest convenience, referencing our enquiry number ${enquiry.enquiryNumber}.

Kind regards,
MM Engineered Solutions Ltd
Procurement Department`

    return {
      supplierId: supplier.id,
      supplierName: supplier.name,
      supplierEmail: supplier.email || "",
      subject,
      body,
    }
  })

  revalidatePath("/purchasing/enquiries")
  return NextResponse.json({ emails })
}
