import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import PDFDocument from "pdfkit"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      customer: true,
      createdBy: { select: { name: true, email: true } },
      quoteLines: {
        orderBy: { sortOrder: "asc" },
        include: {
          spec: {
            include: {
              variant: { select: { code: true, name: true, type: { select: { name: true, family: { select: { name: true } } } } } },
            },
          },
        },
      },
    },
  })

  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 })
  }

  const mainLines = quote.quoteLines.filter((l) => !l.isOptional)
  const optionalLines = quote.quoteLines.filter((l) => l.isOptional)

  // Create PDF
  const doc = new PDFDocument({ size: "A4", margin: 50 })
  const chunks: Buffer[] = []

  doc.on("data", (chunk: Buffer) => chunks.push(chunk))

  const pdfReady = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)))
  })

  // Header
  doc.fontSize(20).font("Helvetica-Bold").text("MM Engineered Solutions Ltd", { align: "center" })
  doc.fontSize(10).font("Helvetica").text("Precision Steel Fabrication & Installation", { align: "center" })
  doc.moveDown(0.5)

  // Blue line
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#1e40af").lineWidth(2).stroke()
  doc.moveDown(0.5)

  // Quote info
  doc.fontSize(16).font("Helvetica-Bold").fillColor("#1e40af").text(`QUOTATION`)
  doc.moveDown(0.3)
  doc.fontSize(10).font("Helvetica").fillColor("#000000")

  // Two column layout for quote details
  const topY = doc.y
  doc.text(`Quote Number: ${quote.quoteNumber}`, 50, topY)
  doc.text(`Revision: ${quote.revisionNumber}`, 50)
  doc.text(`Date: ${quote.dateCreated.toLocaleDateString("en-GB")}`, 50)
  if (quote.validUntil) {
    doc.text(`Valid Until: ${quote.validUntil.toLocaleDateString("en-GB")}`, 50)
  }
  if (quote.subject) {
    doc.text(`Subject: ${quote.subject}`, 50)
  }

  // Customer details on right
  doc.fontSize(10).font("Helvetica-Bold").text("Customer:", 300, topY)
  doc.font("Helvetica").text(quote.customer.name, 300)
  if (quote.customer.address) doc.text(quote.customer.address, 300)
  if (quote.customer.email) doc.text(quote.customer.email, 300)
  if (quote.customer.phone) doc.text(quote.customer.phone, 300)

  doc.moveDown(1)
  const tableTop = Math.max(doc.y, topY + 80)
  doc.y = tableTop

  // Line items table header
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#e5e7eb").lineWidth(1).stroke()
  doc.moveDown(0.3)

  const colX = { desc: 50, qty: 280, unit: 320, margin: 380, sell: 430, total: 490 }
  doc.fontSize(8).font("Helvetica-Bold").fillColor("#6b7280")
  doc.text("DESCRIPTION", colX.desc, doc.y)
  doc.text("QTY", colX.qty, doc.y, { width: 35, align: "right" })
  doc.text("UNIT COST", colX.unit, doc.y, { width: 50, align: "right" })
  doc.text("MARGIN", colX.margin, doc.y, { width: 40, align: "right" })
  doc.text("UNIT SELL", colX.sell, doc.y, { width: 50, align: "right" })
  doc.text("TOTAL", colX.total, doc.y, { width: 55, align: "right" })
  doc.moveDown(0.5)
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#e5e7eb").lineWidth(0.5).stroke()
  doc.moveDown(0.3)

  // Main lines
  doc.fillColor("#000000")
  let mainCostTotal = 0
  let mainSellTotal = 0

  for (const line of mainLines) {
    if (doc.y > 720) {
      doc.addPage()
      doc.y = 50
    }
    const lineY = doc.y
    const costTotal = Number(line.costTotal || 0)
    const sellTotal = Number(line.sellPrice || 0) * line.quantity
    mainCostTotal += costTotal
    mainSellTotal += sellTotal

    doc.fontSize(9).font("Helvetica")
    let descText = line.dimensions ? `${line.description}\n${line.dimensions}` : line.description
    // Add spec summary for configured lines (no R&D data — client facing)
    if (line.spec) {
      const s = line.spec
      const specParts: string[] = []
      specParts.push(`${s.variant.type.family.name} — ${s.variant.type.name} — ${s.variant.name}`)
      if (s.width && s.height) specParts.push(`${s.width}mm × ${s.height}mm`)
      const selections = s.specSelections as Record<string, string> | null
      if (selections && Object.keys(selections).length > 0) {
        specParts.push(Object.entries(selections).map(([k, v]) => `${k}: ${v}`).join(", "))
      }
      descText += "\n" + specParts.join(" | ")
    }
    doc.text(descText, colX.desc, lineY, { width: 225 })
    const textBottom = doc.y

    doc.fontSize(9)
    doc.text(String(line.quantity), colX.qty, lineY, { width: 35, align: "right" })
    doc.text(fmt(Number(line.unitCost || 0)), colX.unit, lineY, { width: 50, align: "right" })
    doc.text(`${Number(line.marginPercent || 0).toFixed(0)}%`, colX.margin, lineY, { width: 40, align: "right" })
    doc.text(fmt(Number(line.sellPrice || 0)), colX.sell, lineY, { width: 50, align: "right" })
    doc.font("Helvetica-Bold").text(fmt(sellTotal), colX.total, lineY, { width: 55, align: "right" })

    doc.y = Math.max(textBottom, lineY + 14) + 4
  }

  // Main subtotal
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#1e40af").lineWidth(1).stroke()
  doc.moveDown(0.3)
  doc.fontSize(10).font("Helvetica-Bold").fillColor("#1e40af")
  doc.text("SUBTOTAL", colX.desc, doc.y)
  doc.text(fmt(mainSellTotal), colX.total, doc.y, { width: 55, align: "right" })
  doc.moveDown(0.5)

  // Optional extras
  if (optionalLines.length > 0) {
    doc.fillColor("#000000")
    doc.moveDown(0.5)
    doc.fontSize(12).font("Helvetica-Bold").text("Optional Extras")
    doc.moveDown(0.3)
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#e5e7eb").lineWidth(0.5).stroke()
    doc.moveDown(0.3)

    for (const line of optionalLines) {
      if (doc.y > 720) {
        doc.addPage()
        doc.y = 50
      }
      const lineY = doc.y
      const sellTotal = Number(line.sellPrice || 0) * line.quantity

      doc.fontSize(9).font("Helvetica")
      doc.text(line.description, colX.desc, lineY, { width: 225 })
      doc.text(String(line.quantity), colX.qty, lineY, { width: 35, align: "right" })
      doc.text(fmt(Number(line.unitCost || 0)), colX.unit, lineY, { width: 50, align: "right" })
      doc.text(`${Number(line.marginPercent || 0).toFixed(0)}%`, colX.margin, lineY, { width: 40, align: "right" })
      doc.text(fmt(Number(line.sellPrice || 0)), colX.sell, lineY, { width: 50, align: "right" })
      doc.font("Helvetica-Bold").text(fmt(sellTotal), colX.total, lineY, { width: 55, align: "right" })

      doc.moveDown(0.5)
    }
  }

  // Grand total
  doc.moveDown(0.5)
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#1e40af").lineWidth(2).stroke()
  doc.moveDown(0.5)
  doc.fontSize(14).font("Helvetica-Bold").fillColor("#1e40af")
  doc.text("TOTAL (Excl. VAT)", colX.desc, doc.y)
  doc.text(fmt(mainSellTotal), colX.total - 50, doc.y, { width: 105, align: "right" })
  doc.moveDown(0.3)
  const overallMargin = mainSellTotal > 0 ? ((mainSellTotal - mainCostTotal) / mainSellTotal * 100) : 0
  doc.fontSize(9).font("Helvetica").fillColor("#6b7280")
  doc.text(`Overall Margin: ${overallMargin.toFixed(1)}%`, colX.desc)

  // Notes
  if (quote.notes) {
    doc.moveDown(1)
    doc.fillColor("#000000")
    doc.fontSize(10).font("Helvetica-Bold").text("Notes:")
    doc.fontSize(9).font("Helvetica").text(quote.notes)
  }

  // Footer
  doc.moveDown(2)
  doc.fontSize(8).fillColor("#9ca3af")
  doc.text("MM Engineered Solutions Ltd | Precision Steel Fabrication & Installation", 50, 770, { align: "center" })
  doc.text("This quotation is valid for 30 days unless otherwise stated.", { align: "center" })

  // Prepared by
  if (quote.createdBy) {
    doc.moveDown(0.5)
    doc.text(`Prepared by: ${quote.createdBy.name}`, { align: "center" })
  }

  doc.end()

  const pdfBuffer = await pdfReady

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${quote.quoteNumber}.pdf"`,
    },
  })
}

function fmt(n: number): string {
  return `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
