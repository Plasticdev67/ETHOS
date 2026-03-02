import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import PDFDocument from "pdfkit"
import { requireAuth } from "@/lib/api-auth"

// MME brand colours
const NAVY = "#23293a"
const CORAL = "#e95445"
const DARK_GRAY = "#333333"
const MID_GRAY = "#666666"
const LIGHT_GRAY = "#999999"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    if (user instanceof NextResponse) return user

    const { id } = await params

    const invoice = await prisma.salesInvoice.findUnique({
      where: { id },
      include: {
        customer: true,
        project: {
          select: { id: true, name: true, projectNumber: true },
        },
        lines: {
          orderBy: { createdAt: "asc" },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json(
        { error: "Sales invoice not found" },
        { status: 404 }
      )
    }

    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 60, bottom: 60, left: 50, right: 50 },
      info: {
        Title: `Sales Invoice ${invoice.invoiceNumber}`,
        Author: "MM Engineered Solutions",
        Subject: `Invoice ${invoice.invoiceNumber}`,
      },
    })

    const chunks: Buffer[] = []
    doc.on("data", (chunk: Buffer) => chunks.push(chunk))

    const pdfReady = new Promise<Buffer>((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)))
    })

    const pageWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right

    // --- Header ---
    doc
      .save()
      .rect(0, 0, doc.page.width, 90)
      .fill(NAVY)

    doc
      .font("Helvetica-Bold")
      .fontSize(22)
      .fillColor("#ffffff")
      .text("MME", 50, 25, { continued: true })
      .font("Helvetica")
      .fontSize(12)
      .text("  MM Engineered Solutions", { baseline: "middle" })

    doc.rect(0, 90, doc.page.width, 3).fill(CORAL)
    doc.restore()

    // --- Invoice Title ---
    doc.y = 110

    doc
      .font("Helvetica-Bold")
      .fontSize(20)
      .fillColor(NAVY)
      .text(invoice.isCreditNote ? "CREDIT NOTE" : "SALES INVOICE", {
        align: "right",
      })

    doc.moveDown(0.5)

    // --- Invoice details and customer address side by side ---
    const leftX = doc.page.margins.left
    const rightX = doc.page.margins.left + pageWidth / 2 + 20
    const detailsY = doc.y

    // Left side: Customer address
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(CORAL)
      .text("Bill To:", leftX, detailsY)

    doc.moveDown(0.3)
    doc.font("Helvetica").fontSize(10).fillColor(DARK_GRAY)

    if (invoice.customer) {
      doc.text(invoice.customer.name, leftX)
      if (invoice.customer.addressLine1)
        doc.text(invoice.customer.addressLine1, leftX)
      if (invoice.customer.addressLine2)
        doc.text(invoice.customer.addressLine2, leftX)
      const cityLine = [
        invoice.customer.city,
        invoice.customer.county,
        invoice.customer.postcode,
      ]
        .filter(Boolean)
        .join(", ")
      if (cityLine) doc.text(cityLine, leftX)
      if (invoice.customer.country) doc.text(invoice.customer.country, leftX)
    } else {
      doc.text("N/A", leftX)
    }

    // Right side: Invoice details
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(CORAL)
      .text("Invoice Details:", rightX, detailsY)

    doc.moveDown(0.3)
    const detailStartY = doc.y

    const detailLabel = (label: string, value: string, y: number) => {
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(MID_GRAY)
        .text(label, rightX, y, { width: 100 })
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(DARK_GRAY)
        .text(value, rightX + 100, y)
    }

    let dy = detailStartY
    detailLabel("Invoice No:", invoice.invoiceNumber, dy)
    dy += 15
    if (invoice.dateSubmitted) {
      detailLabel(
        "Date:",
        new Date(invoice.dateSubmitted).toLocaleDateString("en-GB"),
        dy
      )
      dy += 15
    }
    if (invoice.dateDue) {
      detailLabel(
        "Due Date:",
        new Date(invoice.dateDue).toLocaleDateString("en-GB"),
        dy
      )
      dy += 15
    }
    if (invoice.certRef) {
      detailLabel("Reference:", invoice.certRef, dy)
      dy += 15
    }
    if (invoice.project) {
      detailLabel(
        "Project:",
        invoice.project.projectNumber || invoice.project.name,
        dy
      )
      dy += 15
    }
    detailLabel("Status:", invoice.status, dy)

    // --- Line Items Table ---
    doc.y = Math.max(doc.y, dy) + 30

    // Table header
    const colWidths = {
      desc: pageWidth * 0.4,
      qty: pageWidth * 0.1,
      unit: pageWidth * 0.15,
      net: pageWidth * 0.15,
      vat: pageWidth * 0.1,
      total: pageWidth * 0.1,
    }

    const tableX = doc.page.margins.left
    let tableY = doc.y

    // Header row
    doc.rect(tableX, tableY, pageWidth, 22).fill(NAVY)

    const headers = [
      { text: "Description", width: colWidths.desc },
      { text: "Qty", width: colWidths.qty },
      { text: "Unit Price", width: colWidths.unit },
      { text: "Net", width: colWidths.net },
      { text: "VAT", width: colWidths.vat },
      { text: "Total", width: colWidths.total },
    ]

    let hx = tableX + 4
    for (const header of headers) {
      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor("#ffffff")
        .text(header.text, hx, tableY + 6, {
          width: header.width - 8,
          align: header.text === "Description" ? "left" : "right",
        })
      hx += header.width
    }

    tableY += 22

    // Data rows
    for (let i = 0; i < invoice.lines.length; i++) {
      const line = invoice.lines[i]

      // Alternate row background
      if (i % 2 === 0) {
        doc.rect(tableX, tableY, pageWidth, 20).fill("#f8f8f8")
      }

      // Check for page break
      if (tableY > doc.page.height - 150) {
        doc.addPage()
        tableY = doc.page.margins.top + 20
      }

      const qty = Number(line.quantity)
      const unitPrice = Number(line.unitPrice)
      const net = Number(line.netAmount)
      const vat = Number(line.vatAmount || 0)
      const total = net + vat

      let rx = tableX + 4
      const rowData = [
        {
          text: line.description,
          width: colWidths.desc,
          align: "left" as const,
        },
        { text: qty.toFixed(2), width: colWidths.qty, align: "right" as const },
        {
          text: unitPrice.toFixed(2),
          width: colWidths.unit,
          align: "right" as const,
        },
        { text: net.toFixed(2), width: colWidths.net, align: "right" as const },
        {
          text: vat.toFixed(2),
          width: colWidths.vat,
          align: "right" as const,
        },
        {
          text: total.toFixed(2),
          width: colWidths.total,
          align: "right" as const,
        },
      ]

      for (const col of rowData) {
        doc
          .font("Helvetica")
          .fontSize(8)
          .fillColor(DARK_GRAY)
          .text(col.text, rx, tableY + 5, {
            width: col.width - 8,
            align: col.align,
            ellipsis: true,
          })
        rx += col.width
      }

      tableY += 20
    }

    // Row border
    doc.rect(tableX, tableY, pageWidth, 0.5).fill("#e0e0e0")

    // --- Totals section ---
    tableY += 15
    const totalsX = tableX + pageWidth * 0.6
    const totalsWidth = pageWidth * 0.4

    const addTotalLine = (
      label: string,
      value: string,
      isBold = false,
      isHighlight = false
    ) => {
      if (isHighlight) {
        doc
          .rect(totalsX - 5, tableY - 2, totalsWidth + 10, 22)
          .fill(NAVY)
      }

      doc
        .font(isBold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(isBold ? 11 : 10)
        .fillColor(isHighlight ? "#ffffff" : DARK_GRAY)
        .text(label, totalsX, tableY, { width: totalsWidth * 0.5 })

      doc
        .font(isBold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(isBold ? 11 : 10)
        .fillColor(isHighlight ? "#ffffff" : DARK_GRAY)
        .text(value, totalsX + totalsWidth * 0.5, tableY, {
          width: totalsWidth * 0.5,
          align: "right",
        })

      tableY += isBold ? 24 : 18
    }

    const subtotal = Number(invoice.subtotal || 0)
    const vatAmount = Number(invoice.vatAmount || 0)
    const total = Number(invoice.total || subtotal + vatAmount)

    addTotalLine("Subtotal:", `£${subtotal.toFixed(2)}`)
    addTotalLine("VAT:", `£${vatAmount.toFixed(2)}`)
    addTotalLine("Total:", `£${total.toFixed(2)}`, true, true)

    if (invoice.retentionHeld && Number(invoice.retentionHeld) > 0) {
      tableY += 5
      addTotalLine(
        "Retention Held:",
        `£${Number(invoice.retentionHeld).toFixed(2)}`
      )
    }

    if (invoice.cisDeduction && Number(invoice.cisDeduction) > 0) {
      addTotalLine(
        "CIS Deduction:",
        `£${Number(invoice.cisDeduction).toFixed(2)}`
      )
    }

    if (invoice.netPayable !== null && invoice.netPayable !== undefined) {
      addTotalLine(
        "Net Payable:",
        `£${Number(invoice.netPayable).toFixed(2)}`,
        true
      )
    }

    // --- Notes ---
    if (invoice.notes) {
      tableY += 15
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(CORAL)
        .text("Notes:", tableX, tableY)
      tableY += 14
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(MID_GRAY)
        .text(invoice.notes, tableX, tableY, { width: pageWidth })
    }

    // --- Footer ---
    const footerY = doc.page.height - 50
    doc.rect(0, footerY - 5, doc.page.width, 1).fill(CORAL)

    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor(LIGHT_GRAY)
      .text(
        "MM Engineered Solutions Ltd | Port Talbot, Wales | Company Reg: XXXXXXXX | VAT Reg: XXXXXXXXX",
        50,
        footerY,
        { width: pageWidth, align: "center" }
      )

    doc.end()

    const pdfBuffer = await pdfReady

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Invoice-${invoice.invoiceNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error("Sales invoice PDF error:", error)
    return NextResponse.json(
      { error: "Failed to generate sales invoice PDF" },
      { status: 500 }
    )
  }
}
