/**
 * Generate ETHOS Status Report PDF (Changelog + Roadmap)
 * Branded with MME coral logo + PX Grotesk font
 * Usage: npx tsx scripts/generate-status-report.ts
 */
import PDFDocument from "pdfkit"
import fs from "fs"
import path from "path"
import sharp from "sharp"

// ── Brand ────────────────────────────────────────────────────────
const NAVY   = "#1e2432"
const CORAL  = "#e95445"
const WHITE  = "#ffffff"
const DARK   = "#2a2a2a"
const MID    = "#4a4a4a"
const LIGHT  = "#8a8a8a"
const PALE   = "#f7f7f8"
const BORDER = "#e2e2e2"
const GREEN  = "#16a34a"
const AMBER  = "#d97706"
const BLUE   = "#2563eb"

// ── Fonts ────────────────────────────────────────────────────────
const FONTS_DIR = path.join(__dirname, "..", "public", "fonts")
const PUBLIC    = path.join(__dirname, "..", "public")

async function svgToPng(svgPath: string, w: number): Promise<Buffer> {
  return sharp(fs.readFileSync(svgPath)).resize({ width: w }).png().toBuffer()
}

async function main() {
  const logoCoralPng = await svgToPng(path.join(PUBLIC, "mme-logo-coral.svg"), 600)

  const coralSvg = fs.readFileSync(path.join(PUBLIC, "mme-logo-coral.svg"), "utf-8")
  const whiteSvg = coralSvg.replace(/fill="#e95445"/g, 'fill="#ffffff"')
  const tmpWhite = path.join(__dirname, "_tmp-white-logo.svg")
  fs.writeFileSync(tmpWhite, whiteSvg)
  const logoWhitePng = await svgToPng(tmpWhite, 600)
  fs.unlinkSync(tmpWhite)

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 105, bottom: 65, left: 60, right: 60 },
    bufferPages: true,
    info: {
      Title: "ETHOS — Development Status Report",
      Author: "MM Engineered Solutions",
      Subject: "ETHOS Development Status — March 2026",
    },
  })

  const out = path.join(__dirname, "..", "ETHOS-Status-Report.pdf")
  const ws = fs.createWriteStream(out)
  doc.pipe(ws)

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
  } catch { /* fallback to Helvetica */ }

  const PW = doc.page.width
  const PH = doc.page.height
  const L  = 60
  const R  = 60
  const CW = PW - L - R

  // ── Helpers ──────────────────────────────────────────────────
  function ensureSpace(h: number) {
    if (doc.y > PH - 65 - h) doc.addPage()
  }

  function sectionHeading(title: string) {
    ensureSpace(50)
    doc.moveDown(1)
    const y = doc.y
    doc.save().rect(L, y, 4, 22).fill(CORAL).restore()
    doc.font(FONT_BOLD).fontSize(14).fillColor(NAVY)
      .text(title, L + 16, y + 3, { width: CW - 16 })
    doc.y = y + 30
    doc.save().rect(L, doc.y, CW, 0.5).fill(BORDER).restore()
    doc.y += 10
  }

  function dateHeading(text: string) {
    ensureSpace(35)
    doc.moveDown(0.6)
    const y = doc.y
    doc.save().roundedRect(L, y, CW, 24, 3).fill(NAVY).restore()
    doc.font(FONT_BOLD).fontSize(10).fillColor(WHITE)
      .text(text, L + 12, y + 7, { width: CW - 24, height: 14 })
    doc.y = y + 30
  }

  function sub(text: string) {
    ensureSpace(28)
    doc.moveDown(0.3)
    doc.font(FONT_BOLD).fontSize(10).fillColor(CORAL)
      .text(text, L, doc.y, { width: CW })
    doc.moveDown(0.2)
  }

  function p(text: string) {
    ensureSpace(20)
    doc.font(FONT_REG).fontSize(9).fillColor(DARK)
      .text(text, L, doc.y, { width: CW, lineGap: 3 })
    doc.moveDown(0.3)
  }

  function bullet(text: string, indent = 0) {
    ensureSpace(16)
    const x = L + 14 + indent * 14
    const w = CW - 14 - indent * 14 - 6
    const y = doc.y
    doc.save()
    doc.circle(x, y + 4, indent > 0 ? 1.5 : 2).fill(indent > 0 ? LIGHT : CORAL)
    doc.restore()
    doc.font(FONT_REG).fontSize(9).fillColor(DARK)
      .text(text, x + 8, y, { width: w, lineGap: 2.5 })
    doc.moveDown(0.1)
  }

  function bulletBold(label: string, desc: string) {
    ensureSpace(16)
    const x = L + 14
    const w = CW - 20
    const y = doc.y
    doc.save().circle(x, y + 4, 2).fill(CORAL).restore()
    doc.font(FONT_BOLD).fontSize(9).fillColor(DARK)
      .text(label + " ", x + 8, y, { width: w, continued: true })
      .font(FONT_REG).text(desc, { lineGap: 2.5 })
    doc.moveDown(0.1)
  }

  function statusBadge(text: string, color: string) {
    ensureSpace(20)
    const y = doc.y
    const badgeW = doc.font(FONT_BOLD).fontSize(8).widthOfString(text) + 16
    doc.save().roundedRect(L + 14, y, badgeW, 16, 3).fill(color).restore()
    doc.font(FONT_BOLD).fontSize(8).fillColor(WHITE)
      .text(text, L + 14 + 8, y + 4, { width: badgeW - 16, height: 12 })
    doc.y = y + 20
  }

  function callout(text: string) {
    ensureSpace(34)
    const y = doc.y
    const h = doc.font(FONT_REG).fontSize(8.5).heightOfString(text, { width: CW - 28 }) + 14
    doc.save()
    doc.roundedRect(L, y, CW, h, 3).fill("#fef3f2")
    doc.rect(L, y, 3, h).fill(CORAL)
    doc.restore()
    doc.font(FONT_REG).fontSize(8.5).fillColor(MID)
      .text(text, L + 14, y + 7, { width: CW - 28 })
    doc.y = y + h + 6
  }

  // ════════════════════════════════════════════════════════════════
  //  PAGE 1 — TITLE
  // ════════════════════════════════════════════════════════════════
  doc.save().rect(0, 0, PW, PH).fill(NAVY).restore()

  doc.image(logoWhitePng, PW / 2 - 100, 160, { width: 200 })

  doc.save().rect(PW / 2 - 40, 290, 80, 2.5).fill(CORAL).restore()

  doc.font(FONT_BOLD).fontSize(28).fillColor(WHITE)
    .text("ETHOS", 0, 320, { width: PW, align: "center" })
  doc.font(FONT_LIGHT).fontSize(14).fillColor("#ffffff90")
    .text("Development Status Report", 0, 358, { width: PW, align: "center" })

  doc.save().rect(PW / 2 - 50, 395, 100, 0.5).fill("#ffffff30").restore()

  doc.font(FONT_REG).fontSize(11).fillColor("#ffffffcc")
    .text("March 2026", 0, 415, { width: PW, align: "center" })
  doc.font(FONT_LIGHT).fontSize(9).fillColor("#ffffff60")
    .text("Prepared for Board Review", 0, 440, { width: PW, align: "center" })

  doc.font(FONT_LIGHT).fontSize(8).fillColor("#ffffff40")
    .text("MM Engineered Solutions Ltd", 0, PH - 100, { width: PW, align: "center" })
  doc.font(FONT_LIGHT).fontSize(7.5).fillColor("#ffffff30")
    .text("Confidential", 0, PH - 85, { width: PW, align: "center" })

  // ════════════════════════════════════════════════════════════════
  //  PART 1 — CHANGELOG (What's Been Built)
  // ════════════════════════════════════════════════════════════════
  doc.addPage()

  sectionHeading("Development Changelog")
  p("A chronological record of all features, fixes, and improvements delivered to the ETHOS platform.")

  // --- 1 March 2026 ---
  dateHeading("1 March 2026")

  sub("Work Stream Refactor")
  bullet("Removed old project classification system (Normal / Mega / Sub-contract) from entire codebase")
  bullet("All project categorisation now uses the 5 MME work streams: Utility, Bespoke, Community, Blast, Refurbishment")
  bullet("ICU remains as a separate flag for urgent projects requiring immediate attention")
  bullet("Production dashboard uses a single production lane instead of Normal/Mega split")
  bullet("Colour-coded work stream badges across project cards, kanban board, and detail pages")
  bullet("Updated 16 source files: filters, forms, toolbars, cards, API routes, production utilities")
  bullet("Production and Projects SOPs updated and regenerated")

  sub("Theme Cleanup")
  bullet("Removed Cyberpunk and Sage themes — application is now light-theme only")
  bullet("Deleted ~630 lines of theme CSS, removed Orbitron font")
  bullet("Simplified 7 layout and component files")
  bullet("Updated System Overview SOP to reflect branding-only section")

  sub("SOP Documentation & Docs Page")
  bullet("7 Standard Operating Procedure PDFs generated with full MME branding:")
  bullet("System Overview (10 pages), CRM & Quoting (11 pages), Design Module (7 pages)", 1)
  bullet("Production & Workshop (10 pages), Purchasing (10 pages)", 1)
  bullet("Finance (15 pages), Project Management (11 pages)", 1)
  bullet("New /docs page with card grid layout, module icons, and PDF download buttons")
  bullet("All PDFs use PX Grotesk brand font, coral MME logo, navy headers/footers")
  bullet("Supabase daily backup info added to System Overview SOP Data & Security section")

  // --- 28 Feb 2026 ---
  dateHeading("28 February 2026")

  sub("Finance API Endpoints (14 new routes)")
  bullet("Customer and supplier list endpoints with search and active filters")
  bullet("Bank receipts, payments, and inter-bank transfers with auto-journal entries")
  bullet("Sales invoice creation and listing")
  bullet("VAT return details and status management")
  bullet("Year-end processing: P&L preview and period close with journal")
  bullet("Fixed asset depreciation (straight-line and reducing balance)")
  bullet("Prepayment release processing")
  bullet("Bank rule auto-matching for unreconciled transactions")
  bullet("Branded PDF generation for sales and purchase invoices")

  sub("Smart Purchase Order Features")
  bulletBold("BOM-to-PO linking:", "tracks which BOM items have been purchased via bomLineId FK")
  bulletBold("Quick PO from BOM:", "one-click groups unpurchased items by supplier and creates POs")
  bulletBold("Cost variance alerts:", "compares BOM estimates vs actual PO prices, flags >10% differences")
  bulletBold("PO approval workflow:", "threshold-based approval with approve/reject endpoints")
  bulletBold("Repeat PO suggestions:", "suggests previous suppliers and prices from purchase history")

  sub("Procurement Enquiry / RFQ System")
  bullet("4 new database models: ProcurementEnquiry, EnquiryLine, EnquiryResponse, EnquiryResponseLine")
  bullet("Full workflow: select BOM lines, choose suppliers, send enquiry emails, record quotes")
  bullet("Side-by-side quote comparison across all responding suppliers")
  bullet("One-click award creates PO automatically from winning quote")

  sub("Data Import Wizards (Sage Migration)")
  bullet("Pure TypeScript CSV parser — no external dependencies")
  bullet("7-step import wizard: select type, upload, map fields, validate, preview, confirm, complete")
  bullet("7 import types: Customers, Suppliers, Chart of Accounts, Opening Balances, Products, POs, Invoices")
  bullet("Dry-run mode, downloadable CSV templates, field mapping with validation")

  sub("Migration Scripts")
  bullet("Smart PO migration and Procurement Enquiry migration run successfully on Supabase")

  // --- 27 Feb 2026 ---
  dateHeading("27 February 2026")

  sub("Finance Module — Full Integration (Phases 1-8)")
  p("Complete double-entry accounting system integrated into ETHOS, replacing the need for standalone accounting software for day-to-day operations.")

  bulletBold("Phase 1:", "Schema merge — 30 new finance tables, 21 enums, seed data (69 accounts, 8 VAT codes, 12 periods)")
  bulletBold("Phase 2:", "Finance sub-navigation layout with collapsible sidebar (7 sections)")
  bulletBold("Phase 3:", "Core accounting — chart of accounts, journals, accounting periods, VAT codes, cost centres")
  bulletBold("Phase 4:", "Purchase ledger — purchase invoices, aged creditors, supplier statements")
  bulletBold("Phase 5:", "Sales ledger + construction contracts — NEC/JCT, applications for payment, retention, credit control")
  bulletBold("Phase 6:", "Banking — accounts, transactions, reconciliation, bank rules, pay/receive/transfer")
  bulletBold("Phase 7:", "Tax, fixed assets, depreciation, recurring entries, prepayments, budgets, reports (P&L, balance sheet, trial balance)")
  bulletBold("Phase 8:", "Integration hooks — 8 auto-journal functions for zero double-entry on invoices, payments, transfers")

  callout("Stats: 66 API routes, 68 pages, 1 layout, 8 auto-journal functions. All data backed up daily on Supabase.")

  // ════════════════════════════════════════════════════════════════
  //  PART 2 — ROADMAP (What's Planned)
  // ════════════════════════════════════════════════════════════════
  doc.addPage()

  sectionHeading("Roadmap & Backlog")
  p("Planned features and items under discussion, prioritised by business impact.")

  // --- Product Configurator ---
  sub("Product Configurator Pricing")
  statusBadge("HIGH PRIORITY", CORAL)
  p("The highest-impact feature for the sales team. MME's products are parametric — a flood door at 2400x1200 follows predictable cost rules vs 2400x1500. Instead of estimators manually calculating every quote, ETHOS would encode the formulas and calculate costs automatically when dimensions and specs are entered.")

  bulletBold("Parametric BOMs:", "formulas like \"steel_qty = height x width x depth x density + wastage\" instead of fixed quantities")
  bulletBold("Product rules:", "conditional logic — \"if width > 2000mm, add centre mullion\" or \"if hydrostatic head > 1.5m, upgrade seal\"")
  bulletBold("Product family templates:", "pick Hinged Flood Door, enter dimensions/specs, system generates full costed BOM")
  bulletBold("Estimator override:", "any calculated value can be manually overridden and locked from recalculation")

  p("Approach: start with hinged flood doors (highest volume), validate against 10 real quotes, then roll out to other product families one at a time.")

  callout("Foundation already exists — the BOM library has formula fields and the CRM quoting module links quotes to products with dimensions. The gap is connecting those two systems.")

  // --- ISO 9001 ---
  sub("ISO 9001 Document Control System")
  statusBadge("MEDIUM PRIORITY", AMBER)
  p("ETHOS could handle ISO 9001:2015 Clause 7.5 (Documented Information) requirements. Three levels under consideration:")

  bulletBold("Lightweight:", "revision history on SOP PDFs, document reference numbers, \"uncontrolled copy\" footer, git as audit trail")
  bulletBold("Medium:", "database-backed document register with review due dates, version history, overdue review flags")
  bulletBold("Full:", "approval workflow with digital sign-off, review scheduling, distribution control, obsolete version archiving")

  p("Questions to decide: which level suits MME now? Should wider QMS docs live in ETHOS? Who approves changes? What review cycle?")

  // --- Production Time Logging ---
  sub("Production Time Logging System")
  statusBadge("PARKED", LIGHT)
  p("Multi-worker time logging for shop floor tablets. Awaiting feedback from Production Manager on current Sage/Sicon workflow before proceeding.")

  bullet("Need to support: multiple workers on same product, split products, workers moving between jobs in a shift")
  bullet("Questions sent to production team on 28 Feb 2026 — awaiting response")
  bullet("Design direction: TimeLog model with worker/product/stage/project linking, tablet-friendly UI, estimated vs actual dashboard")

  // --- Project Passport ---
  sub("Project Passport")
  statusBadge("HIGH PRIORITY", CORAL)
  p("Every MME project passes through Sales, Design, Production, and Install. ETHOS already moves the data — job numbers, BOMs, costs. What it doesn't move is context: why decisions were made, what was agreed on the phone, what the site is actually like. That gets lost at every handover because it lives in heads, emails, and Teams chats.")

  p("The Project Passport is a single living record inside each ETHOS project that captures operational context alongside the data. Each department has a guided section with prompted fields — not blank pages — that get filled in during normal work, not as a separate exercise.")

  bulletBold("Contextual prompts:", "passport fields appear when people are already working — creating projects, uploading surveys, logging calls, raising NCRs")
  bulletBold("Hard gates:", "project can't move forward until the outgoing team's section is complete and signed off at every stage transition")
  bulletBold("AI document extraction:", "upload tender packs, sub-contracts, and specs — ETHOS reads them and pre-fills passport fields, humans review and confirm")
  bulletBold("Spec compliance checking:", "drawings and BOMs cross-referenced against client specs, mismatches flagged before they become problems")

  callout("What it replaces: the informal, undocumented handover that currently happens between departments — or doesn't happen at all.")

  // ════════════════════════════════════════════════════════════════
  //  HEADERS + FOOTERS (painted last via bufferPages)
  // ════════════════════════════════════════════════════════════════
  const range = doc.bufferedPageRange()
  const total = range.count

  for (let i = 0; i < total; i++) {
    doc.switchToPage(i)

    if (i === 0) continue // title page already styled

    // Header: navy bar + coral line + logo
    doc.save()
    doc.rect(0, 0, PW, 80).fill(NAVY)
    doc.rect(0, 80, PW, 2.5).fill(CORAL)
    doc.restore()
    doc.image(logoWhitePng, L, 24, { width: 140 })
    doc.font(FONT_LIGHT).fontSize(7.5).fillColor("#ffffff60")
      .text("ETHOS Status Report — March 2026", PW - R - 160, 34, { width: 160, align: "right", height: 12 })

    // Footer: coral line + text
    doc.save()
    doc.rect(0, PH - 45, PW, 1).fill(CORAL)
    doc.restore()
    doc.font(FONT_LIGHT).fontSize(7).fillColor(LIGHT)
      .text("MM Engineered Solutions Ltd", L, PH - 35, { width: CW / 2, height: 12 })
    doc.font(FONT_LIGHT).fontSize(7).fillColor(LIGHT)
      .text(`Page ${i} of ${total - 1}`, PW / 2, PH - 35, { width: CW / 2, align: "right", height: 12 })
  }

  doc.switchToPage(total - 1)
  doc.end()

  await new Promise<void>((resolve) => ws.on("finish", resolve))
  console.log(`Generated: ${out}`)
  console.log(`${total} pages`)
}

main().catch((err) => {
  console.error("Failed:", err)
  process.exit(1)
})
