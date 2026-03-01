/**
 * Generate Design Process SOP PDF
 * Uses the actual MME coral logo + PX Grotesk brand font
 * Usage: npx tsx scripts/generate-design-sop.ts
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
      Title: "ETHOS — Design Module SOP",
      Author: "MM Engineered Solutions",
      Subject: "ETHOS Design Module SOP v1.0",
    },
  })

  const out = path.join(__dirname, "..", "ETHOS-Design-Module-SOP.pdf")
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
    .text("Design Module", 0, doc.y, { width: PW, align: "center" })
  doc.moveDown(0.2)
  doc.font(FONT_LIGHT).fontSize(18).fillColor(CORAL)
    .text("ETHOS System Guide", 0, doc.y, { width: PW, align: "center" })

  doc.y = 540
  doc.font(FONT_LIGHT).fontSize(10).fillColor("#ffffff80")
    .text("ETHOS ERP  |  Design Module", 0, doc.y, { width: PW, align: "center" })
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
    "2.  Who Does What",
    "3.  The Design Lifecycle",
    "4.  NCR Rework",
    "5.  BOM Management",
    "6.  Job Card Dependency Chain",
    "7.  Status Reference",
    "8.  Where to Find Things",
    "9.  Automatic Status Progression",
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

  sectionHeading("1", "Overview")
  p("The ETHOS Design module manages the complete lifecycle of engineering design work — from the moment a project enters the design phase through to formal handover to production.")
  p("Every product on a project gets its own Design Card with four sequential Job Cards that must be completed in order.")

  // ── 2 ──
  sectionHeading("2", "Who Does What")
  const c1 = 160, c2 = CW - 160
  th(["Role", "Permissions"], [c1, c2])
  td(["Engineering Manager", "Activate, assign, start/review/approve/reject, sign off, handover"], [c1, c2])
  td(["Project Manager / Coordinator", "Activate design, assign designers, propose handover"], [c1, c2])
  td(["Design Engineer", "Start jobs, submit for review, approve/reject peer work"], [c1, c2])
  td(["R&D Manager", "Start jobs, submit for review"], [c1, c2])
  td(["Production Manager", "Acknowledge or reject handovers"], [c1, c2])
  td(["Directors (MD, TD)", "All of the above including sign-off and handover"], [c1, c2])
  doc.moveDown(0.4)
  callout("Design Engineers can start, submit, and peer-review. Only Engineering Manager and Directors can sign off — this is the senior quality gate.")

  // ── 3 ──
  sectionHeading("3", "The Design Lifecycle")

  sub("Step 1 — Project Enters Design")
  p("A project reaches the Design stage via the projects board or after a quote converts. Products are defined but no design work has started. The project appears in the Waiting column on the Design Board.")

  sub("Step 2 — Activate Design")
  p("Who: Engineering Manager, Project Manager, Project Coordinator, or Admin")
  p("Click the project in the Waiting column and select Activate Design.")
  b("One Design Card created per product")
  b("Each card gets 4 Job Cards in fixed order:")
  b("GA Drawing", 1)
  b("Production Drawings", 1)
  b("BOM Finalisation", 1)
  b("Design Review", 1)
  b("First job set to Ready — rest are Blocked until the previous is approved")
  b("Target dates auto-calculated from the project deadline")

  sub("Step 3 — Assign a Designer")
  p("Who: Engineering Manager, Project Manager, Project Coordinator, or Admin")
  bb("Quick assign —", "one designer to the entire card (all 4 jobs)")
  bb("Granular assign —", "different designers per job card with individual deadlines")
  p("On assignment the card moves to In Progress. The start date is recorded and the designer sees it on their My Work view.")
  callout("Only Design Engineer, Engineering Manager, R&D Manager, or Admin roles can be assigned design work.")

  sub("Step 4 — Start a Job Card")
  p("Who: The assigned designer")
  p("Open the job card and click Start. Available when status is Ready or Rejected (for rework).")
  b("Job card moves to In Progress")
  b("Start timestamp recorded")

  sub("Step 5 — Submit for Review")
  p("Who: The designer working on the job")
  p("Click Submit for Review. Optionally add notes and log actual hours.")
  b("Job card moves to Submitted")
  b("Parent Design Card moves to Review status")
  b("Submission timestamp recorded")

  sub("Step 6 — Review")
  p("A reviewer examines the submitted work. Two outcomes:")

  subsub("6a — Approve")
  b("Job card moves to Approved")
  b("Next job card automatically unlocks (Blocked to Ready)")
  b("Design Card returns to In Progress")

  subsub("6b — Reject")
  p("A rejection reason is required.")
  b("Job card moves to Rejected with reason")
  b("Designer sees the reason and a Re-work button")
  b("Re-work restarts the job from In Progress")

  sub("Step 7 — Sign Off")
  p("Who: Engineering Manager, Managing Director, Technical Director, or Admin")
  p("After approval, a senior authority signs off — the final quality gate.")
  b("Job card moves to Signed Off")
  b("All 4 signed off: Design Card becomes Complete")
  b("All cards complete: project advances to Design Freeze")

  sub("Step 8 — Propose Handover")
  p("Who: Engineering Manager, Project Manager, Project Coordinator, or Directors")
  p("Click Propose Handover when design cards are complete. The package includes:")
  b("Checklist: GA drawings, production drawings, BOM, design review, drawing numbers")
  b("Design notes for production")
  b("Partial handover support — hand over completed products while others continue")

  sub("Step 9 — Production Response")
  p("Who: Production Manager, Directors, or Admin")

  subsub("Acknowledge")
  b("Handover becomes Acknowledged")
  b("Production Task created per product (starting at Cutting)")
  b("Product department changes from Design to Production")
  b("All products handed over: project advances to Manufacture")

  subsub("Reject")
  b("Handover becomes Rejected with reason")
  b("No production tasks created — design must resubmit")

  // ── 4 ──
  sectionHeading("4", "NCR Rework")
  p("If a Non-Conformance Report requires design rework after production has started:")
  b("NCR rework triggered against the design card")
  b("Specified job cards reset to In Progress / Ready")
  b("Design Card reverts to In Progress")
  b("Acknowledged handover reverts to Draft")
  b("Design completes rework then resubmits the handover")

  // ── 5 ──
  sectionHeading("5", "BOM Management")
  p("Each Design Card has an associated Bill of Materials accessible from the BOM editor.")
  b("Auto-populated from the product's catalogue item or keyword-matched template")
  bb("Categories:", "Materials, Labour, Hardware, Seals, Finish, Other")
  bb("Each line:", "description, part number, supplier, quantity, unit, unit cost, notes")
  b("Managed during BOM Finalisation but editable at any time")

  // ── 6 ──
  sectionHeading("6", "Job Card Dependency Chain")
  p("Jobs must be completed in strict sequential order. A job cannot start until the previous one is approved or signed off.")
  doc.moveDown(0.5)

  const chain = [
    { label: "GA Drawing", note: "Ready immediately" },
    { label: "Production Drawings", note: "Unlocked when GA approved" },
    { label: "BOM Finalisation", note: "Unlocked when Prod Dwgs approved" },
    { label: "Design Review", note: "Unlocked when BOM approved" },
  ]
  const BW = 200, BH = 32
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
  const fy = doc.y
  doc.save().roundedRect(BX, fy, BW, BH, 4).fill(CORAL).restore()
  doc.font(FONT_BOLD).fontSize(9.5).fillColor(WHITE)
    .text("DESIGN CARD COMPLETE", BX, fy + 10, { width: BW, align: "center" })
  doc.y = fy + BH + 12

  // ── 7 ──
  sectionHeading("7", "Status Reference")
  const s1 = 120, s2 = CW - 120

  sub("Design Card Statuses")
  th(["Status", "Meaning"], [s1, s2])
  td(["Queued", "Design activated, waiting for designer assignment"], [s1, s2])
  td(["In Progress", "Designer assigned, job cards being worked on"], [s1, s2])
  td(["Review", "A job card has been submitted for review"], [s1, s2])
  td(["Complete", "All 4 job cards signed off"], [s1, s2])
  td(["On Hold", "Manually paused"], [s1, s2])
  doc.moveDown(0.4)

  sub("Job Card Statuses")
  th(["Status", "Meaning"], [s1, s2])
  td(["Blocked", "Waiting for previous job to be approved"], [s1, s2])
  td(["Ready", "Can be started"], [s1, s2])
  td(["In Progress", "Designer actively working"], [s1, s2])
  td(["Submitted", "Sent for review"], [s1, s2])
  td(["Approved", "Reviewer approved — unlocks next job"], [s1, s2])
  td(["Rejected", "Reviewer rejected — needs rework"], [s1, s2])
  td(["Signed Off", "Senior sign-off complete"], [s1, s2])
  doc.moveDown(0.4)

  sub("Handover Statuses")
  th(["Status", "Meaning"], [s1, s2])
  td(["Draft", "Not yet submitted (or reverted by NCR)"], [s1, s2])
  td(["Submitted", "Awaiting production acknowledgement"], [s1, s2])
  td(["Acknowledged", "Production accepted — tasks created"], [s1, s2])
  td(["Rejected", "Production rejected — design must resubmit"], [s1, s2])

  // ── 8 ──
  sectionHeading("8", "Where to Find Things")
  const n1 = 155, n2 = CW - 155
  th(["Feature", "Location"], [n1, n2])
  td(["Design Board (Kanban)", "/design — main view"], [n1, n2])
  td(["My Work", "/design > My Work tab"], [n1, n2])
  td(["Workload overview", "/design > Workload tab"], [n1, n2])
  td(["Assign designers", "Click a card > Assign"], [n1, n2])
  td(["BOM editor", "Design card > BOM tab"], [n1, n2])
  td(["Handover form", "Design Board > Propose Handover"], [n1, n2])
  td(["Pending handovers", "/design > Handovers tab"], [n1, n2])
  td(["Overdue cards", "/design > Overdue section"], [n1, n2])

  // ── 9 ──
  sectionHeading("9", "Automatic Status Progression")
  p("The design module automatically advances the project. No manual status changes needed.")
  doc.moveDown(0.2)
  bb("Design —", "products awaiting design work")
  bb("Design Freeze —", "all design cards complete, all job cards signed off")
  bb("Manufacture —", "handover acknowledged, production tasks created")

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
      .text("ETHOS Design Module v1.0", PW - R - 140, 34, { width: 140, align: "right", height: 12 })

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
