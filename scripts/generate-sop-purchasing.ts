/**
 * Generate Purchasing SOP PDF
 * Uses the actual MME coral logo + PX Grotesk brand font
 * Usage: npx tsx scripts/generate-sop-purchasing.ts
 */
import PDFDocument from "pdfkit"
import fs from "fs"
import path from "path"
import sharp from "sharp"

// ── Brand ────────────────────────────────────────────────────────
const NAVY   = "#1e2432"
const CORAL  = "#e95445"
const CYAN   = "#5BB8F5"
const WHITE  = "#ffffff"
const DARK   = "#2a2a2a"
const MID    = "#4a4a4a"
const LIGHT  = "#8a8a8a"
const PALE   = "#f7f7f8"
const BORDER = "#e2e2e2"

// ── Fonts ────────────────────────────────────────────────────────
const FONTS_DIR = path.join(__dirname, "..", "public", "fonts")
const PUBLIC    = path.join(__dirname, "..", "public")

async function svgToPng(svgPath: string, w: number): Promise<Buffer> {
  return sharp(fs.readFileSync(svgPath)).resize({ width: w }).png().toBuffer()
}

async function main() {
  // ── Logo: coral version (for light backgrounds) ──
  const logoCoralPng = await svgToPng(path.join(PUBLIC, "mme-logo-coral.svg"), 600)

  // ── Logo: white version (for dark backgrounds) ──
  const coralSvg = fs.readFileSync(path.join(PUBLIC, "mme-logo-coral.svg"), "utf-8")
  const whiteSvg = coralSvg.replace(/fill="#e95445"/g, 'fill="#ffffff"')
  const tmpWhite = path.join(__dirname, "_tmp-white-logo.svg")
  fs.writeFileSync(tmpWhite, whiteSvg)
  const logoWhitePng = await svgToPng(tmpWhite, 600)
  fs.unlinkSync(tmpWhite)

  // ── Doc ────────────────────────────────────────────────────────
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 105, bottom: 65, left: 60, right: 60 },
    bufferPages: true,
    info: {
      Title: "ETHOS — Purchasing SOP",
      Author: "MM Engineered Solutions",
      Subject: "ETHOS Purchasing SOP v1.0",
    },
  })

  const out = path.join(__dirname, "..", "ETHOS-Purchasing-SOP.pdf")
  const ws = fs.createWriteStream(out)
  doc.pipe(ws)

  // Register PX Grotesk (try woff first, fall back to Helvetica)
  let FONT_REG = "Helvetica"
  let FONT_BOLD = "Helvetica-Bold"
  let FONT_LIGHT = "Helvetica"
  try {
    doc.registerFont("PXGrotesk", path.join(FONTS_DIR, "pxgroteskregular-webfont.woff"))
    doc.registerFont("PXGrotesk-Bold", path.join(FONTS_DIR, "pxgrotesk-bold-webfont.woff"))
    doc.registerFont("PXGrotesk-Light", path.join(FONTS_DIR, "pxgrotesk-light-webfont.woff"))
    FONT_REG = "PXGrotesk"
    FONT_BOLD = "PXGrotesk-Bold"
    FONT_LIGHT = "PXGrotesk-Light"
    console.log("Using PX Grotesk fonts")
  } catch {
    console.log("PX Grotesk WOFF not supported by PDFKit, using Helvetica")
  }

  const PW = doc.page.width
  const PH = doc.page.height
  const L  = 60
  const R  = 60
  const CW = PW - L - R

  // ── Helpers ──────────────────────────────────────────────────
  function ensureSpace(h: number) {
    if (doc.y > PH - 65 - h) doc.addPage()
  }

  function sectionHeading(num: string, title: string) {
    ensureSpace(50)
    doc.moveDown(1)
    const y = doc.y
    // coral accent bar
    doc.save().rect(L, y, 4, 22).fill(CORAL).restore()
    doc.font(FONT_BOLD).fontSize(14).fillColor(NAVY)
      .text(`${num}.  ${title}`, L + 16, y + 3, { width: CW - 16 })
    doc.y = y + 30
    doc.save().rect(L, doc.y, CW, 0.5).fill(BORDER).restore()
    doc.y += 10
  }

  function sub(text: string) {
    ensureSpace(30)
    doc.moveDown(0.3)
    doc.font(FONT_BOLD).fontSize(10.5).fillColor(CORAL)
      .text(text, L, doc.y, { width: CW })
    doc.moveDown(0.25)
  }

  function subsub(text: string) {
    ensureSpace(24)
    doc.moveDown(0.15)
    doc.font(FONT_BOLD).fontSize(9.5).fillColor(MID)
      .text(text, L + 14, doc.y, { width: CW - 14 })
    doc.moveDown(0.15)
  }

  function p(text: string) {
    ensureSpace(22)
    doc.font(FONT_REG).fontSize(9).fillColor(DARK)
      .text(text, L, doc.y, { width: CW, lineGap: 3 })
    doc.moveDown(0.3)
  }

  function b(text: string, indent = 0) {
    ensureSpace(18)
    const x = L + 14 + indent * 14
    const w = CW - 14 - indent * 14 - 6
    const y = doc.y
    doc.save()
    doc.circle(x, y + 4, indent > 0 ? 1.5 : 2).fill(indent > 0 ? LIGHT : CORAL)
    doc.restore()
    doc.font(FONT_REG).fontSize(9).fillColor(DARK)
      .text(text, x + 8, y, { width: w, lineGap: 2.5 })
    doc.moveDown(0.12)
  }

  function bb(label: string, desc: string) {
    ensureSpace(18)
    const x = L + 14
    const w = CW - 20
    const y = doc.y
    doc.save()
    doc.circle(x, y + 4, 2).fill(CORAL)
    doc.restore()
    doc.font(FONT_BOLD).fontSize(9).fillColor(DARK)
      .text(label + " ", x + 8, y, { width: w, continued: true })
      .font(FONT_REG).text(desc, { lineGap: 2.5 })
    doc.moveDown(0.12)
  }

  function callout(text: string) {
    ensureSpace(30)
    const y = doc.y
    doc.save()
    doc.roundedRect(L, y, CW, 26, 3).fill("#fef3f2")
    doc.rect(L, y, 3, 26).fill(CORAL)
    doc.restore()
    doc.font(FONT_REG).fontSize(8.5).fillColor(MID)
      .text(text, L + 14, y + 7, { width: CW - 28 })
    doc.y = y + 32
  }

  let tIdx = 0
  function th(cells: string[], widths: number[]) {
    tIdx = 0
    ensureSpace(22)
    const y = doc.y
    doc.save()
    doc.roundedRect(L, y, CW, 22, 2).fill(NAVY)
    doc.restore()
    let x = L
    cells.forEach((c, i) => {
      doc.font(FONT_BOLD).fontSize(8).fillColor(WHITE)
        .text(c, x + 8, y + 7, { width: widths[i] - 16, height: 12, ellipsis: true })
      x += widths[i]
    })
    doc.y = y + 23
  }

  function td(cells: string[], widths: number[]) {
    ensureSpace(20)
    const y = doc.y
    const bg = tIdx % 2 === 0 ? WHITE : PALE
    tIdx++
    doc.save()
    doc.rect(L, y, CW, 20).fill(bg)
    doc.rect(L, y + 20, CW, 0.5).fill(BORDER)
    doc.restore()
    let x = L
    cells.forEach((c, i) => {
      doc.font(FONT_REG).fontSize(8).fillColor(DARK)
        .text(c, x + 8, y + 5, { width: widths[i] - 16, height: 13, ellipsis: true })
      x += widths[i]
    })
    doc.y = y + 21
  }

  // ════════════════════════════════════════════════════════════════
  //  PAGE 1 — TITLE
  // ════════════════════════════════════════════════════════════════
  doc.save().rect(0, 0, PW, PH).fill(NAVY).restore()

  // White logo centred
  doc.image(logoWhitePng, (PW - 220) / 2, 220, { width: 220 })

  doc.y = 290
  doc.save().rect((PW - 60) / 2, doc.y, 60, 2).fill(CORAL).restore()
  doc.y += 40

  doc.font(FONT_BOLD).fontSize(36).fillColor(WHITE)
    .text("Purchasing", 0, doc.y, { width: PW, align: "center" })
  doc.moveDown(0.2)
  doc.font(FONT_LIGHT).fontSize(18).fillColor(CORAL)
    .text("ETHOS System Guide", 0, doc.y, { width: PW, align: "center" })

  doc.y = 540
  doc.font(FONT_LIGHT).fontSize(10).fillColor("#ffffff80")
    .text("ETHOS ERP  |  Purchasing Module", 0, doc.y, { width: PW, align: "center" })
    .text("Version 1.0  |  March 2026", { width: PW, align: "center" })

  doc.y = 740
  doc.font(FONT_LIGHT).fontSize(8).fillColor("#ffffff30")
    .text("CONFIDENTIAL — MM Engineered Solutions", 0, doc.y, { width: PW, align: "center" })

  // ════════════════════════════════════════════════════════════════
  //  PAGE 2 — CONTENTS
  // ════════════════════════════════════════════════════════════════
  doc.addPage()

  doc.font(FONT_BOLD).fontSize(18).fillColor(NAVY)
    .text("Contents", L, doc.y, { width: CW })
  doc.moveDown(0.4)
  doc.save().rect(L, doc.y, 50, 2).fill(CORAL).restore()
  doc.y += 16

  const toc = [
    "1.  Overview",
    "2.  Suppliers",
    "3.  Creating Purchase Orders",
    "4.  Smart PO from BOM",
    "5.  PO Approval Workflow",
    "6.  Cost Variance Monitoring",
    "7.  Procurement Enquiries / RFQ",
    "8.  PO Lifecycle & Statuses",
    "9.  Where to Find Things",
  ]
  toc.forEach((t, i) => {
    const y = doc.y
    doc.save().circle(L + 6, y + 5, 2).fill(i === 0 ? CORAL : BORDER).restore()
    doc.font(FONT_REG).fontSize(10).fillColor(DARK)
      .text(t, L + 18, y, { width: CW - 18 })
    doc.moveDown(0.35)
  })

  // ════════════════════════════════════════════════════════════════
  //  CONTENT
  // ════════════════════════════════════════════════════════════════
  doc.addPage()

  // ── 1 ──
  sectionHeading("1", "Overview")
  p("The ETHOS Purchasing module manages the complete procurement lifecycle — from raising purchase orders and managing supplier relationships through to goods receipt, cost tracking, and competitive tendering via procurement enquiries.")
  p("It is tightly integrated with the Design module's Bill of Materials (BOM), enabling one-click PO generation from design data and real-time cost variance monitoring between estimated BOM costs and actual purchase prices.")
  b("Raise and track purchase orders against projects and suppliers")
  b("Auto-generate POs from BOM data (Quick PO)")
  b("Track BOM procurement status — which items have been purchased")
  b("Approval workflow for POs above configurable thresholds")
  b("Monitor cost variance: BOM estimate vs actual PO price")
  b("Run competitive procurement enquiries (RFQ) across multiple suppliers")
  b("Receive goods line-by-line with partial receipt support")
  b("Compare supplier quotes side-by-side and award with auto PO creation")

  // ── 2 ──
  sectionHeading("2", "Suppliers")
  p("Supplier records are the foundation of purchasing. Every purchase order and procurement enquiry links to a supplier. Suppliers can be created in advance or on-the-fly when raising a PO.")

  sub("Supplier Record Fields")
  const sc1 = 140, sc2 = CW - 140
  th(["Field", "Description"], [sc1, sc2])
  td(["Name", "Company name (required, used for matching in Quick PO)"], [sc1, sc2])
  td(["Email", "Primary contact email — used in enquiry email templates"], [sc1, sc2])
  td(["Phone", "Contact phone number"], [sc1, sc2])
  td(["What They Supply", "Free-text description of products/services"], [sc1, sc2])
  td(["Account Code", "Unique Sage account code for finance integration"], [sc1, sc2])
  td(["VAT Number", "Supplier VAT registration number"], [sc1, sc2])
  td(["Payment Terms", "Default payment terms in days (default: 30)"], [sc1, sc2])
  td(["Address", "Full address (line 1, line 2, city, county, postcode, country)"], [sc1, sc2])
  td(["Active", "Active/inactive flag — inactive suppliers hidden from dropdowns"], [sc1, sc2])
  doc.moveDown(0.4)

  sub("Creating a Supplier")
  p("Suppliers can be created in two ways:")
  bb("Standalone —", "via the Suppliers page (/api/suppliers). Add name, contact details, and what they supply.")
  bb("Inline —", "when creating a PO, switch the supplier dropdown to \"+ New Supplier\" to create one on the fly. The new supplier is saved and immediately linked to the PO.")
  callout("Quick PO matches BOM supplier names to existing supplier records using case-insensitive name matching. Keep supplier names consistent across BOMs for best results.")

  // ── 3 ──
  sectionHeading("3", "Creating Purchase Orders")
  p("Purchase orders can be created manually through the Create PO dialog on the Purchasing page. This is the standard method when you need full control over what goes on the PO.")

  sub("Step 1 — Select a Project")
  p("Choose the project this PO is for. Only active (non-complete) projects appear in the dropdown. Selecting a project triggers automatic loading of BOM suggestions and BOM procurement status.")

  sub("Step 2 — Choose or Create a Supplier")
  p("Select an existing supplier from the dropdown, or switch to \"+ New Supplier\" to create one inline with name, email, phone, and what they supply.")

  sub("Step 3 — Set Value and Delivery")
  b("Total Value — enter a manual value, or leave blank to auto-calculate from selected BOM lines")
  b("Expected Delivery — target delivery date for the order")

  sub("Step 4 — Select BOM Items (Optional)")
  p("When a project is selected, the BOM Suggestions panel loads automatically. It shows all purchasable BOM items (excluding Labour category and in-house \"make\" items from Sage).")
  b("Each item shows: description, part number, quantity, unit cost")
  b("Items already purchased show a green \"Purchased\" badge with the linked PO number")
  b("Unpurchased items show an amber \"Unpurchased\" badge")
  b("Select/deselect individual items — selected items become PO lines")
  b("The bomLineId is recorded on each PO line, creating a traceable link from BOM to PO")

  sub("Step 5 — Add Notes and Submit")
  p("Add optional notes, then click Create PO. The system auto-generates the PO number (PO-XXXX format, auto-incrementing), creates the PO in DRAFT status, and creates PO lines from selected BOM items.")

  sub("Adding Lines After Creation")
  p("Expand any PO row in the table to see its line items. Click \"+ Add Line Item\" at the bottom to add additional lines. Enter description, quantity, and unit cost. The PO total is automatically recalculated from all lines.")

  // ── 4 ──
  sectionHeading("4", "Smart PO from BOM")
  p("The Smart PO features automate purchase order creation using data from the Design module's Bill of Materials. This dramatically reduces manual data entry and ensures consistency between design and procurement.")

  sub("Quick PO — Buy All Unpurchased")
  p("The Quick PO button appears when a project is selected in the Create PO dialog. One click generates purchase orders for all unpurchased BOM items.")
  p("How it works:")
  b("Fetches all non-Labour BOM lines for the project")
  b("Cross-references with Sage stock items to exclude in-house \"make\" items (defaultMake = true)")
  b("Filters out items that already have linked PO lines (already purchased)")
  b("Groups remaining items by supplier name")
  b("Creates one PO per supplier group, each in DRAFT status")
  b("Each PO line records the bomLineId for traceability")
  b("PO numbers auto-generated sequentially (PO-XXXX)")
  callout("Quick PO creates DRAFT orders — they still need review and approval before sending to suppliers. The notes field records \"Auto-generated Quick PO for [Supplier Name]\".")

  sub("BOM Procurement Status")
  p("The BOM Status API tracks which BOM items have been procured. For each non-Labour BOM line on a project, it reports:")
  b("Purchased — the item has at least one linked PO line, with the PO number and status shown")
  b("Unpurchased — no PO line exists for this BOM item yet")
  p("Summary counts of total, purchased, and unpurchased items are returned alongside the detail.")

  sub("Suggest BOM Items")
  p("The Suggest BOM API returns all purchasable BOM lines for a project. It excludes Labour items and cross-references Sage to remove \"make\" items, presenting only items that need to be bought externally. This powers both the BOM Suggestions panel in the PO dialog and the RFQ item selection.")

  sub("Repeat Suggestions")
  p("The Suggest Repeat API helps find historical pricing for items you are about to purchase. Given a BOM line, part number, or description, it searches across all existing PO lines to find previous purchases of the same or similar items.")
  b("Exact match on part number via linked BOM line")
  b("Description keyword matching (splits into keywords, searches case-insensitively)")
  b("Returns: supplier, unit cost, total cost, quantity, PO number, PO status, and date")
  b("Up to 20 suggestions, ordered by most recent first")
  callout("Use repeat suggestions to validate pricing and identify preferred suppliers for recurring materials.")

  // ── 5 ──
  sectionHeading("5", "PO Approval Workflow")
  p("Purchase orders go through an approval workflow before being sent to suppliers. The approval endpoint supports both approval and rejection.")

  sub("Approving a PO")
  p("Who: Authenticated users with approval authority")
  b("PO status changes from DRAFT to APPROVED")
  b("The approver's user ID and timestamp are recorded (approvedById, approvedAt)")
  b("Optional approval notes can be added")

  sub("Rejecting a PO")
  p("If a PO is not satisfactory, the reviewer can reject it:")
  b("PO status reverts to DRAFT")
  b("Rejection reason is recorded in the notes field")
  b("Approval fields are cleared (approvedById and approvedAt set to null)")
  b("The PO creator can then amend and resubmit for approval")

  sub("Approval Threshold")
  p("Each PO has an optional approvalThreshold field (Decimal). This can be used to enforce value-based approval rules — POs above a certain value require senior approval. The threshold is recorded on the PO record for audit purposes.")
  callout("All approval and rejection actions are auditable — the system records who approved/rejected, when, and with what notes.")

  // ── 6 ──
  sectionHeading("6", "Cost Variance Monitoring")
  p("The Cost Variance API compares BOM estimates against actual PO prices for a project. This is critical for tracking whether procurement costs are in line with what Design estimated during BOM finalisation.")

  sub("How It Works")
  p("For each non-Labour BOM line that has a linked PO line:")
  b("BOM side: quantity, unit cost, and line total from the Design BOM")
  b("PO side: quantity, unit cost, and line total from the linked Purchase Order line")
  b("Variance: the difference (PO cost minus BOM cost) in both absolute and percentage terms")

  sub("Variance Report Output")
  const vc1 = 150, vc2 = CW - 150
  th(["Field", "Description"], [vc1, vc2])
  td(["Per-line variance", "Absolute and percentage variance for each item"], [vc1, vc2])
  td(["Total BOM cost", "Sum of all BOM line estimates"], [vc1, vc2])
  td(["Total PO cost", "Sum of all actual PO line costs"], [vc1, vc2])
  td(["Total variance", "Overall difference (absolute and %)"], [vc1, vc2])
  doc.moveDown(0.4)
  p("A positive variance means the PO price exceeded the BOM estimate. A negative variance means procurement achieved a saving against the estimate.")
  callout("Monitor cost variance regularly. Consistent positive variance may indicate BOM estimates need updating, or that alternative suppliers should be explored via the RFQ process.")

  // ── 7 ──
  sectionHeading("7", "Procurement Enquiries / RFQ")
  p("The Procurement Enquiry (RFQ — Request for Quotation) module lets you send itemised quote requests to multiple suppliers, compare their responses side-by-side, and award the winning quote to automatically create a Purchase Order.")

  sub("Creating an Enquiry")
  p("Navigate to Purchasing > Enquiries > New Enquiry. The creation follows a 3-step wizard:")

  subsub("Step 1 — Select Project & Items")
  b("Choose a project from the dropdown")
  b("The system loads all purchasable BOM items (via the Suggest BOM API)")
  b("Select which items to include in the enquiry (all selected by default)")
  b("Items show description, part number, quantity, unit, and estimated cost")

  subsub("Step 2 — Select Suppliers")
  b("Browse or search the supplier list")
  b("Select one or more suppliers to send the enquiry to")
  b("Each selected supplier will receive a separate response record")

  subsub("Step 3 — Review & Create")
  b("Enter a subject line (e.g. \"Materials for Flood Door Assembly\")")
  b("Add optional notes or special requirements")
  b("Review the summary: project, item count, selected suppliers")
  b("Click Create Enquiry")

  p("The system generates an enquiry number (ENQ-XXXXXX format using a sequence counter), creates enquiry lines from the selected BOM items, and creates a response record per supplier in PENDING status.")

  sub("Sending the Enquiry")
  p("On the enquiry detail page, click Send Enquiry. This:")
  b("Updates the enquiry status from DRAFT to SENT")
  b("Records the sentAt timestamp")
  b("Updates all response records with emailSentAt")
  b("Generates per-supplier email templates with a formatted item table")
  b("Email templates include: supplier greeting, enquiry reference, project details, itemised table, and instructions for what to quote")
  b("Copy each email to clipboard and paste into your email client")
  callout("ETHOS generates the email content but does not send emails directly. Copy the template and send via your normal email (Outlook, etc.).")

  sub("Entering Supplier Responses")
  p("When quotes come back from suppliers, enter them on the enquiry detail page:")
  b("Expand the supplier's response section and click \"Enter Response\"")
  b("Enter overall: total quoted, lead time (days), validity date, notes")
  b("Enter per-line: unit price, lead time, availability (yes/no), notes")
  b("Click Save Response — the response status changes to QUOTED")
  b("The enquiry status auto-updates: PARTIALLY_RESPONDED when some suppliers quote, ALL_RESPONDED when all have")

  sub("Comparing Quotes")
  p("Once at least one supplier has quoted, click Compare Quotes to open a side-by-side comparison view:")
  b("One row per enquiry line item, one column per supplier")
  b("Each cell shows: total price, unit price, and lead time")
  b("Lowest price per line highlighted in green")
  b("Items marked unavailable highlighted in red")
  b("Footer row shows per-supplier totals with average and max lead times")
  b("Lowest overall total highlighted in green")

  sub("Awarding the Enquiry")
  p("From either the response list or the comparison view, click Award & Create PO on the winning supplier:")
  b("Winning response status set to AWARDED")
  b("All other responses set to DECLINED")
  b("Enquiry status set to AWARDED")
  b("A new Purchase Order is automatically created in DRAFT status")
  b("PO lines populated from the winning response's line-item pricing")
  b("PO notes reference the source enquiry number and subject")
  callout("The awarded PO is created in DRAFT status. It still needs to go through the normal approval workflow before being sent to the supplier.")

  // ── 8 ──
  sectionHeading("8", "PO Lifecycle & Statuses")
  p("Purchase orders progress through a defined lifecycle. Status transitions happen automatically based on user actions.")

  sub("PO Status Flow")
  // Flow diagram
  const chain = [
    { label: "DRAFT", note: "PO created, awaiting review" },
    { label: "APPROVED", note: "Reviewed and approved" },
    { label: "SENT", note: "Sent to supplier" },
    { label: "PARTIALLY RECEIVED", note: "Some lines received" },
    { label: "COMPLETE", note: "All lines fully received" },
  ]
  const BW = 220, BH = 32
  const BX = (PW - BW) / 2

  ensureSpace(chain.length * 52 + 60)

  chain.forEach((item, i) => {
    const by = doc.y
    doc.save().roundedRect(BX, by, BW, BH, 4).fill(NAVY).restore()
    doc.font(FONT_BOLD).fontSize(9).fillColor(WHITE)
      .text(item.label, BX, by + 6, { width: BW, align: "center" })
    doc.font(FONT_LIGHT).fontSize(7).fillColor("#ffffff70")
      .text(item.note, BX, by + 19, { width: BW, align: "center" })
    doc.y = by + BH + 3
    if (i < chain.length - 1) {
      const ax = PW / 2
      doc.save()
      doc.moveTo(ax, doc.y).lineTo(ax, doc.y + 10).lineWidth(1.5).stroke(CYAN)
      doc.moveTo(ax - 4, doc.y + 7).lineTo(ax, doc.y + 13).lineTo(ax + 4, doc.y + 7).fill(CYAN)
      doc.restore()
      doc.y += 16
    }
  })
  doc.y += 4

  // Side branch: CANCELLED
  const cy = doc.y
  doc.save().roundedRect(BX, cy, BW, BH, 4).fill(CORAL).restore()
  doc.font(FONT_BOLD).fontSize(9.5).fillColor(WHITE)
    .text("CANCELLED", BX, cy + 10, { width: BW, align: "center" })
  doc.y = cy + BH + 4
  p("A PO can be cancelled at any point before completion.")
  doc.moveDown(0.2)

  sub("PO Status Reference")
  const s1 = 150, s2 = CW - 150
  th(["Status", "Meaning"], [s1, s2])
  td(["Draft", "PO created but not yet approved — editable"], [s1, s2])
  td(["Approved", "Reviewed and approved — ready to send to supplier"], [s1, s2])
  td(["Sent", "Dispatched to the supplier (dateSent recorded)"], [s1, s2])
  td(["Partially Received", "At least one line received, but not all"], [s1, s2])
  td(["Complete", "All lines fully received — PO closed"], [s1, s2])
  td(["Cancelled", "PO cancelled — no further action"], [s1, s2])
  doc.moveDown(0.4)

  sub("Goods Receipt")
  p("Lines are received individually from the expanded PO row in the purchase orders table:")
  b("Click Receive on any unreceived line")
  b("Enter the received quantity and optional notes")
  b("If receivedQty equals or exceeds the ordered quantity, the line is marked as fully received")
  b("Partial receipts are supported — the received badge shows received/ordered (e.g. 5/10)")
  b("PO status automatically updates:")
  b("PARTIALLY_RECEIVED — when at least one line has goods received", 1)
  b("COMPLETE — when all lines are fully received", 1)

  sub("Enquiry Statuses")
  th(["Status", "Meaning"], [s1, s2])
  td(["Draft", "Enquiry created but not sent to suppliers"], [s1, s2])
  td(["Sent", "Enquiry sent — awaiting supplier responses"], [s1, s2])
  td(["Partially Responded", "Some suppliers have quoted, others pending"], [s1, s2])
  td(["All Responded", "All suppliers have quoted or declined"], [s1, s2])
  td(["Awarded", "A supplier has been selected and PO created"], [s1, s2])
  td(["Cancelled", "Enquiry cancelled — no further action"], [s1, s2])
  doc.moveDown(0.4)

  sub("Enquiry Response Statuses")
  th(["Status", "Meaning"], [s1, s2])
  td(["Pending", "Enquiry sent, awaiting supplier's quote"], [s1, s2])
  td(["Quoted", "Supplier has submitted their pricing"], [s1, s2])
  td(["Declined", "Supplier declined or was not selected"], [s1, s2])
  td(["Awarded", "This supplier won the enquiry"], [s1, s2])

  // ── 9 ──
  sectionHeading("9", "Where to Find Things")
  const n1 = 175, n2 = CW - 175
  th(["Feature", "Location"], [n1, n2])
  td(["Purchase Orders list", "/purchasing — main PO table"], [n1, n2])
  td(["Create new PO", "/purchasing > New PO button"], [n1, n2])
  td(["PO line items", "Expand any PO row in the table"], [n1, n2])
  td(["Receive goods", "Expand PO row > Receive button on line"], [n1, n2])
  td(["Quick PO from BOM", "New PO dialog > select project > Quick PO button"], [n1, n2])
  td(["BOM procurement status", "New PO dialog > BOM Suggestions panel badges"], [n1, n2])
  td(["PO approval", "API: POST /api/purchase-orders/[id]/approve"], [n1, n2])
  td(["Cost variance report", "API: GET /api/purchase-orders/cost-variance"], [n1, n2])
  td(["Repeat purchase suggestions", "API: GET /api/purchase-orders/suggest-repeat"], [n1, n2])
  td(["Procurement enquiries list", "/purchasing/enquiries"], [n1, n2])
  td(["Create new enquiry", "/purchasing/enquiries/new — 3-step wizard"], [n1, n2])
  td(["Enquiry detail & responses", "/purchasing/enquiries/[id]"], [n1, n2])
  td(["Compare supplier quotes", "Enquiry detail > Compare Quotes button"], [n1, n2])
  td(["Award enquiry", "Enquiry detail > Award button on response"], [n1, n2])
  td(["Supplier management", "/api/suppliers"], [n1, n2])

  // ════════════════════════════════════════════════════════════════
  //  HEADERS + FOOTERS (painted last via bufferPages)
  // ════════════════════════════════════════════════════════════════
  const range = doc.bufferedPageRange()
  const total = range.count

  for (let i = 0; i < total; i++) {
    doc.switchToPage(i)

    if (i === 0) continue // title page is already styled

    // Header: navy bar + coral line + logo
    doc.save()
    doc.rect(0, 0, PW, 80).fill(NAVY)
    doc.rect(0, 80, PW, 2.5).fill(CORAL)
    doc.restore()
    doc.image(logoWhitePng, L, 24, { width: 140 })
    doc.font(FONT_LIGHT).fontSize(7.5).fillColor("#ffffff60")
      .text("ETHOS Purchasing v1.0", PW - R - 140, 34, { width: 140, align: "right", height: 12 })

    // Footer: coral line + text
    const footY = PH - 40
    doc.save().rect(0, footY - 4, PW, 0.75).fill(CORAL).restore()
    doc.font(FONT_LIGHT).fontSize(7).fillColor(LIGHT)
      .text("ETHOS  |  MM Engineered Solutions", L, footY, { height: 10 })
    doc.font(FONT_LIGHT).fontSize(7).fillColor(LIGHT)
      .text(`${i + 1}  /  ${total}`, PW - R - 50, footY, { width: 50, align: "right", height: 10 })
  }

  // Switch back to last content page to prevent trailing blank pages
  doc.switchToPage(total - 1)

  // ── Done ───────────────────────────────────────────────────────
  doc.end()

  ws.on("finish", () => {
    console.log(`Generated: ${out}`)
    console.log(`${total} pages`)
  })
}

main().catch(console.error)
