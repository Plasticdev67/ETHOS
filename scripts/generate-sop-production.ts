/**
 * Generate Production & Workshop SOP PDF
 * Uses the actual MME coral logo + PX Grotesk brand font
 * Usage: npx tsx scripts/generate-sop-production.ts
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
      Title: "ETHOS — Production & Workshop SOP",
      Author: "MM Engineered Solutions",
      Subject: "ETHOS Production & Workshop SOP v1.0",
    },
  })

  const out = path.join(__dirname, "..", "ETHOS-Production-SOP.pdf")
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
    .text("Production & Workshop", 0, doc.y, { width: PW, align: "center" })
  doc.moveDown(0.2)
  doc.font(FONT_LIGHT).fontSize(18).fillColor(CORAL)
    .text("ETHOS System Guide", 0, doc.y, { width: PW, align: "center" })

  doc.y = 540
  doc.font(FONT_LIGHT).fontSize(10).fillColor("#ffffff80")
    .text("ETHOS ERP  |  Production & Workshop Module", 0, doc.y, { width: PW, align: "center" })
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
    "3.  Design Handover Integration",
    "4.  Production Stages",
    "5.  Production Board",
    "6.  Task Management",
    "7.  Workshop View",
    "8.  Dashboard",
    "9.  Scheduling & Time Estimates",
    "10.  Status Reference",
    "11.  Where to Find Things",
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

  // ── 1. Overview ──
  sectionHeading("1", "Overview")
  p("The ETHOS Production & Workshop module manages the complete manufacturing lifecycle — from the moment a project is handed over from the Design team through every workshop stage until products are packed, dispatched, and the project advances to Installation.")
  p("Every product on a project is tracked individually through a defined stage pipeline. The module provides three complementary views: a high-level Production Board for project managers, a granular Workshop View for shopfloor supervisors, and a Dashboard with KPIs, drag-and-drop stage management, and filtering.")
  p("Products are split into two production lanes: Configure to Order (standard products) and Innovate to Order (mega/bespoke products), each with their own swim lane on the dashboard.")

  // ── 2. Who Does What ──
  sectionHeading("2", "Who Does What")
  const c1 = 160, c2 = CW - 160
  th(["Role", "Permissions"], [c1, c2])
  td(["Production Manager", "Accept/reject handovers, manage tasks, inspect work, move stages, schedule"], [c1, c2])
  td(["Production Supervisor", "Manage tasks, inspect work, move stages, create NCRs"], [c1, c2])
  td(["Production Planner", "Manage tasks, move stages, schedule products, assign workers"], [c1, c2])
  td(["Workshop Operators", "Start tasks, complete tasks (via shopfloor/workshop view)"], [c1, c2])
  td(["Engineering Manager", "Accept/reject handovers, full production access"], [c1, c2])
  td(["Directors (MD, TD)", "All of the above including handover decisions"], [c1, c2])
  doc.moveDown(0.4)
  callout("Only roles with production:inspect permission can approve or reject completed work at inspection. Rejection creates an NCR automatically.")

  // ── 3. Design Handover Integration ──
  sectionHeading("3", "Design Handover Integration")
  p("Production work begins when the Design team completes their work and proposes a handover. The production module receives these handovers and must act on them before manufacturing can start.")

  sub("How Tasks Arrive from Design")
  b("Design completes all 4 job cards (GA Drawing, Production Drawings, BOM Finalisation, Design Review) for each product")
  b("Design proposes a handover — either full (all products) or partial (selected products)")
  b("The handover appears in the Pending Handover column on the Production Board")
  b("Production Manager or authorised user reviews the handover package")

  sub("Accepting a Handover")
  b("Click Accept on the pending handover card")
  b("The handover status changes to Acknowledged")
  b("A ProductionTask record is created for each included product, starting at Cutting")
  b("Each product's department changes from Design to Production")
  b("Once all products are handed over, the project status advances to Manufacture")

  sub("Rejecting a Handover")
  b("Click Return and provide a rejection reason")
  b("The handover returns to Design with the rejection reason")
  b("No production tasks are created — the design team must address the issue and resubmit")

  sub("Design Freeze Projects")
  p("Projects in the Design Freeze status (design complete but handover not yet formally acknowledged) also appear in the Pending Handover column. Production can accept these directly, which auto-submits and acknowledges the handover in one step.")
  callout("Partial handovers are supported — you can accept completed products into production while other products continue in design.")

  // ── 4. Production Stages ──
  sectionHeading("4", "Production Stages")
  p("Every product moves through a defined pipeline of manufacturing stages. The six workshop stages represent the physical processes on the factory floor.")
  doc.moveDown(0.3)

  const stages = [
    { label: "Cutting", note: "Raw material cutting — 1 station, ~3 hours/product" },
    { label: "Weld/Fab", note: "Welding & fabrication — 6 stations, ~3 days/product" },
    { label: "Pre-Fit/Fitting", note: "Assembly & fitting — 2 stations, ~2 days/product" },
    { label: "Shotblast", note: "Surface preparation — 1 station, ~4 hours/product" },
    { label: "Painting", note: "Coating & finishing — 2 stations, ~2 days (incl. drying)" },
    { label: "Packing", note: "Final packing & dispatch prep — 2 stations, ~1 day/product" },
  ]

  const BW = 220, BH = 32
  const BX = (PW - BW) / 2

  ensureSpace(stages.length * 52 + 60)

  stages.forEach((item, i) => {
    const by = doc.y
    doc.save().roundedRect(BX, by, BW, BH, 4).fill(NAVY).restore()
    doc.font(FONT_BOLD).fontSize(9).fillColor(WHITE)
      .text(item.label, BX, by + 6, { width: BW, align: "center" })
    doc.font(FONT_LIGHT).fontSize(7).fillColor("#ffffff70")
      .text(item.note, BX, by + 19, { width: BW, align: "center" })
    doc.y = by + BH + 3
    if (i < stages.length - 1) {
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
    .text("DISPATCHED / COMPLETED", BX, fy + 10, { width: BW, align: "center" })
  doc.y = fy + BH + 12

  doc.moveDown(0.3)
  sub("Additional Statuses")
  p("Beyond the six workshop stages, products may also be in these statuses:")
  bb("Awaiting —", "Product has entered production but has not reached the first workshop stage yet")
  bb("Dispatched —", "Product has been packed and sent to site")
  bb("Storage —", "Product is manufactured but held in storage pending dispatch")
  bb("Sub-Contract —", "Product is being manufactured by an external sub-contractor")
  bb("Rework —", "Product requires rework due to NCR (Non-Conformance Report)")
  bb("N/A —", "Stage not applicable to this product")

  // ── 5. Production Board ──
  sectionHeading("5", "Production Board")
  p("The Production Board (/production) provides a three-column Kanban view giving an at-a-glance picture of all production work.")

  sub("Column 1: Pending Handover")
  b("Shows projects awaiting production acceptance from design")
  b("Formally submitted handovers with Accept/Return actions")
  b("Design Freeze projects ready for direct acceptance")
  b("Displays included products, partial handover indicators, and proposer details")

  sub("Column 2: Producing")
  b("All active production projects (status: MANUFACTURE or DESIGN_FREEZE with acknowledged handover)")
  b("Each project card shows: project number, customer, priority badges (ICU, NCR count)")
  b("Stage summary bar — colour-coded segments showing each product's current stage")
  b("Expandable product list with stage dropdown and worker assignment")
  b("Production start date and deadline (DDL) displayed")
  b("Complete Production button appears when all products reach a finished stage")

  sub("Column 3: Handover")
  b("Projects where production is complete (status: INSTALLATION, REVIEW, or COMPLETE)")
  b("Shows completion date and current downstream status")

  callout("Clicking a project card opens the Schedule Dialog for detailed time estimates and start date planning.")

  // ── 6. Task Management ──
  sectionHeading("6", "Task Management")
  p("Production tasks are the atomic units of workshop work. Each task represents one product at one stage.")

  sub("Starting a Task")
  p("Who: Users with production:manage permission")
  b("Select a worker from the dropdown (workers are filtered by stage-appropriate role)")
  b("Click Start — the task moves from Pending/Rework to In Progress")
  b("Start timestamp is recorded")
  b("Worker roles per stage: Cutter (Cutting), Welder (Weld/Fab), Fitter (Pre-Fit/Fitting), Painter (Shotblast & Painting), Packer (Packing)")

  sub("Completing a Task")
  p("Who: Users with production:manage permission")
  b("Click Complete — the task moves to Completed status")
  b("The task now awaits inspection before the product advances to the next stage")
  b("Completion timestamp and actual minutes are recorded")

  sub("Inspection")
  p("Who: Users with production:inspect permission")
  p("After a task is completed, it requires quality inspection before advancing.")

  subsub("Accept")
  b("Task inspection status set to Accepted")
  b("Product automatically advances to the next stage in the pipeline")
  b("If this was the final stage (Packing), the product is marked Completed")

  subsub("Reject")
  b("A rejection reason / NCR description is required")
  b("An NCR (Non-Conformance Report) is automatically created and linked to the task")
  b("The task status moves to Rework")
  b("The product remains at the current stage until rework is completed and re-inspected")

  sub("Holding and Resuming")
  b("Tasks can be placed On Hold (paused) by production managers")
  b("Held tasks show a Resume button to return them to In Progress")

  sub("Moving Products Between Stages")
  p("Products can be manually moved between stages via the stage dropdown on expanded product cards. This calls the move API and updates the product's productionStatus directly. Use this for corrections or when a product needs to skip or revisit a stage.")

  // ── 7. Workshop View ──
  sectionHeading("7", "Workshop View")
  p("The Workshop View (/production/workshop) provides a stage-focused operational view designed for daily workshop management by supervisors and team leads.")

  sub("Stage Tabs")
  b("Six tabs across the top, one per workshop stage: Cutting, Weld/Fab, Pre-Fit/Fitting, Shotblast, Painting, Packing")
  b("Selecting a tab loads all tasks for that stage with real-time data")
  b("Each tab shows colour-coded border indicating the stage")

  sub("Four Swim Lanes")
  p("Within each stage, tasks are organised into four horizontal swim lanes:")

  subsub("LIVE")
  b("Tasks currently in progress (status: IN_PROGRESS)")
  b("Shows assigned worker, product details, project context, and a live countdown to deadline")
  b("Complete button to mark work as done")

  subsub("COMPLETED (Awaiting Inspection)")
  b("Tasks where work is done but inspection is pending")
  b("Approve/Reject buttons for quality inspection")
  b("Rejection creates an NCR and moves task to Rework")

  subsub("READY TO START")
  b("Tasks queued and ready to begin (status: PENDING or REWORK)")
  b("Start button to begin work — opens worker assignment")
  b("Rework tasks are visually flagged")

  subsub("ALLOCATED")
  b("Products that are allocated to this stage but are still at a previous stage")
  b("Shows current stage with animated indicator")
  b("Provides forward visibility of upcoming work")

  sub("Stats Bar")
  b("Live count of tasks per lane (live, ready, awaiting inspection, allocated)")
  b("Completed today counter")
  b("Auto-refreshes when stage tab changes")

  callout("The Workshop View supports three themes (light, cyberpunk, sage) with full colour adaptation for each swim lane.")

  // ── 8. Dashboard ──
  sectionHeading("8", "Dashboard")
  p("The Production Dashboard (/production/dashboard) provides a comprehensive operational overview with KPIs, filtering, and drag-and-drop stage management.")

  sub("KPI Stats Bar")
  b("Total active projects and product count")
  b("Total contract value across active production")
  b("Overdue project count (highlighted in red)")
  b("ICU (critical) project count")
  b("Active NCR count")

  sub("Toolbar & Filtering")
  b("Search across project numbers, names, customers, and product descriptions")
  b("Filter by classification: All, ICU, Mega, Normal")
  b("Filter by schedule status: All, Overdue, At Risk (within 7 days), On Track")
  b("Filter by Project Manager")
  b("Filter by Client/Customer")
  b("Time horizon filter: All, This Week, This Month")
  b("Compact/Full view mode toggle")

  sub("Design Pipeline Preview")
  p("Two optional columns appear when there are projects approaching production:")
  bb("Design Complete —", "read-only preview of projects still in Design where some design cards are complete")
  bb("Pending Handover —", "actionable handovers awaiting Accept/Return decision")

  sub("Active Projects Section")
  b("Collapsible grid of all active production projects")
  b("Each card shows stage summary bar, start/deadline dates, product progress")
  b("Expandable product list with stage dropdowns and worker assignment")
  b("Complete Production button when all products are finished")

  sub("Product Stage Grid (Drag-and-Drop)")
  p("Below the project section, two product lane rows display all products grouped by stage:")
  bb("Configure to Order —", "standard production flow (grey theme)")
  bb("Innovate to Order —", "mega/bespoke products (indigo theme)")
  b("Products can be dragged between stage columns to update their production status")
  b("Each column corresponds to a workshop stage: Cutting through Packing")
  b("Product cards show description, part code, project number, deadline, and schedule colour indicator")

  sub("Sub-Contract Section")
  p("Projects classified as SUB_CONTRACT are displayed in a separate section below the main grid, keeping the primary view focused on in-house production.")

  // ── 9. Scheduling & Time Estimates ──
  sectionHeading("9", "Scheduling & Time Estimates")
  p("The Schedule Dialog (opened by clicking a project card) provides per-product time estimation and start date planning.")

  sub("Per-Product Scheduling")
  b("Set individual start dates for each product, or use Set All to apply one date globally")
  b("Enter estimated hours for each workshop stage per product")
  b("Default stage durations: Cutting 3h, Weld/Fab 24h, Fitting 16h, Shotblast 4h, Painting 16h, Packing 8h")
  b("End dates auto-calculated based on start date and total hours (8-hour working days, skipping weekends)")

  sub("Capacity Information")
  p("The system tracks workstation counts per stage to inform planning:")
  const cap1 = 150, cap2 = 100, cap3 = CW - 250
  th(["Stage", "Stations", "Station Labels"], [cap1, cap2, cap3])
  td(["Cutting", "1", "C1"], [cap1, cap2, cap3])
  td(["Weld/Fab", "6", "W1, W2, W3, W4, W5, W6"], [cap1, cap2, cap3])
  td(["Pre-Fit/Fitting", "2", "F1, F2"], [cap1, cap2, cap3])
  td(["Shotblast", "1", "S1"], [cap1, cap2, cap3])
  td(["Painting", "2", "P1, P2"], [cap1, cap2, cap3])
  td(["Packing", "2", "K1, K2"], [cap1, cap2, cap3])
  doc.moveDown(0.4)

  sub("Deadline Tracking")
  b("Project deadline displayed alongside calculated end dates")
  b("End dates that exceed the project deadline are highlighted in red")
  b("Latest end date across all products shown as a project-level summary")
  b("Save All button persists all estimates to the database, or save per-product")

  // ── 10. Status Reference ──
  sectionHeading("10", "Status Reference")
  const s1 = 120, s2 = CW - 120

  sub("Product Production Statuses")
  th(["Status", "Meaning"], [s1, s2])
  td(["Awaiting", "Entered production, not yet at first workshop stage"], [s1, s2])
  td(["Cutting", "At the cutting stage"], [s1, s2])
  td(["Weld/Fab", "At welding and fabrication"], [s1, s2])
  td(["Pre-Fit/Fitting", "At assembly and fitting"], [s1, s2])
  td(["Shotblast", "At surface preparation"], [s1, s2])
  td(["Painting", "At coating and finishing"], [s1, s2])
  td(["Packing", "Being packed for dispatch"], [s1, s2])
  td(["Dispatched", "Sent to site"], [s1, s2])
  td(["Completed", "All stages finished"], [s1, s2])
  td(["Storage", "Manufactured, held pending dispatch"], [s1, s2])
  td(["Sub-Contract", "Being made by external supplier"], [s1, s2])
  td(["Rework", "Returned for rework due to NCR"], [s1, s2])
  td(["N/A", "Stage not applicable"], [s1, s2])
  doc.moveDown(0.4)

  sub("Task Statuses")
  th(["Status", "Meaning"], [s1, s2])
  td(["Pending (Queued)", "Task created, waiting to be started"], [s1, s2])
  td(["In Progress (Active)", "Worker actively performing the task"], [s1, s2])
  td(["Completed", "Work done, awaiting inspection"], [s1, s2])
  td(["Blocked", "Cannot start — depends on upstream process"], [s1, s2])
  td(["On Hold", "Manually paused by production manager"], [s1, s2])
  td(["Rework", "Failed inspection, NCR raised, requires rework"], [s1, s2])
  doc.moveDown(0.4)

  sub("Inspection Statuses")
  th(["Status", "Meaning"], [s1, s2])
  td(["Pending", "Awaiting quality inspection"], [s1, s2])
  td(["Accepted", "Passed inspection — product advances to next stage"], [s1, s2])
  td(["Rejected", "Failed inspection — NCR created, task moves to Rework"], [s1, s2])

  // ── 11. Where to Find Things ──
  sectionHeading("11", "Where to Find Things")
  const n1 = 175, n2 = CW - 175
  th(["Feature", "Location"], [n1, n2])
  td(["Production Board (Kanban)", "/production — main view"], [n1, n2])
  td(["Dashboard (KPIs + grid)", "/production/dashboard"], [n1, n2])
  td(["Workshop (stage-by-stage)", "/production/workshop"], [n1, n2])
  td(["Accept/reject handovers", "Production Board > Pending Handover column"], [n1, n2])
  td(["Move product between stages", "Expand project > stage dropdown on product row"], [n1, n2])
  td(["Assign worker to task", "Workshop View > Ready to Start > Start button"], [n1, n2])
  td(["Inspect completed work", "Workshop View > Completed lane > Approve/Reject"], [n1, n2])
  td(["Schedule & time estimates", "Click any project card > Schedule Dialog"], [n1, n2])
  td(["Sub-contracted projects", "Dashboard > Sub-Contract section (bottom)"], [n1, n2])
  td(["Drag products between stages", "Dashboard > Product Stage Grid (drag & drop)"], [n1, n2])
  td(["NCR from failed inspection", "Workshop > Completed lane > Reject > enters NCR reason"], [n1, n2])
  td(["Filter production projects", "Dashboard > Toolbar (search, classification, status, PM, client)"], [n1, n2])

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
      .text("ETHOS Production v1.0", PW - R - 140, 34, { width: 140, align: "right", height: 12 })

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
