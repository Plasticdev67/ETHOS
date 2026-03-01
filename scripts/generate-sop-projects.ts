/**
 * Generate Project Management SOP PDF
 * Uses the actual MME coral logo + PX Grotesk brand font
 * Usage: npx tsx scripts/generate-sop-projects.ts
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
      Title: "ETHOS — Project Management SOP",
      Author: "MM Engineered Solutions",
      Subject: "ETHOS Project Management SOP v1.0",
    },
  })

  const out = path.join(__dirname, "..", "ETHOS-Projects-SOP.pdf")
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
    .text("Project Management", 0, doc.y, { width: PW, align: "center" })
  doc.moveDown(0.2)
  doc.font(FONT_LIGHT).fontSize(18).fillColor(CORAL)
    .text("ETHOS System Guide", 0, doc.y, { width: PW, align: "center" })

  doc.y = 540
  doc.font(FONT_LIGHT).fontSize(10).fillColor("#ffffff80")
    .text("ETHOS ERP  |  Project Management", 0, doc.y, { width: PW, align: "center" })
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
    "2.  Project Lifecycle",
    "3.  Creating Projects",
    "4.  Project Products",
    "5.  Project Dashboard & Views",
    "6.  Project Statuses",
    "7.  NCR Management",
    "8.  Variations & Change Orders",
    "9.  Installation",
    "10. Project Completion",
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
  p("The ETHOS Project Management module is the central hub for tracking every project from initial enquiry through to final completion and closeout. It provides a single source of truth for all project data — products, financials, NCRs, variations, documents, and team assignments.")
  p("Projects flow through a defined lifecycle of statuses, with gates enforced by the system to ensure work is completed before advancing to the next stage. Each project contains products that move independently through departments (Planning, Design, Production, Installation, Review, Complete).")
  p("The module integrates with the CRM pipeline (for opportunity conversion), Design module (for design card management), Production module (for manufacturing tasks), and Finance module (for cost tracking and invoicing).")

  // ── 2 ──
  sectionHeading("2", "Project Lifecycle")

  sub("P0 to P5 Lifecycle Gates")
  p("Every project progresses through six formal lifecycle gates. These are recorded with timestamps and displayed as a visual progress tracker on the project overview.")

  const g1 = 70, g2 = 180, g3 = CW - 250
  th(["Gate", "Name", "Meaning"], [g1, g2, g3])
  td(["P0", "Enquiry", "Initial enquiry received and logged"], [g1, g2, g3])
  td(["P1", "Quotation", "Quote prepared and submitted to customer"], [g1, g2, g3])
  td(["P2", "Order Handover", "Order received, project formally initiated"], [g1, g2, g3])
  td(["P3", "Design Review", "Design work reviewed and signed off"], [g1, g2, g3])
  td(["P4", "Production Complete", "All products manufactured and packed"], [g1, g2, g3])
  td(["P5", "Handover / Close", "Project delivered and closed out"], [g1, g2, g3])
  doc.moveDown(0.4)

  sub("Project Status Progression")
  p("Alongside lifecycle gates, each project has a Board Status that controls which column it appears in on the Kanban board. Status transitions are enforced by gates.")
  doc.moveDown(0.5)

  // Status flow diagram
  const statuses = [
    { label: "Opportunity", note: "CRM pipeline / early stage" },
    { label: "Quotation", note: "Quote submitted to customer" },
    { label: "Design", note: "Design work in progress" },
    { label: "Design Freeze", note: "All design cards complete" },
    { label: "Manufacture", note: "Production tasks active" },
    { label: "Installation", note: "On-site install phase" },
    { label: "Review", note: "Post-install review" },
  ]
  const BW = 210, BH = 30
  const BX = (PW - BW) / 2

  ensureSpace(statuses.length * 48 + 60)

  statuses.forEach((item, i) => {
    const by = doc.y
    doc.save().roundedRect(BX, by, BW, BH, 4).fill(NAVY).restore()
    doc.font(FONT_BOLD).fontSize(9).fillColor(WHITE)
      .text(item.label, BX, by + 5, { width: BW, align: "center" })
    doc.font(FONT_LIGHT).fontSize(7).fillColor("#ffffff70")
      .text(item.note, BX, by + 18, { width: BW, align: "center" })
    doc.y = by + BH + 3
    if (i < statuses.length - 1) {
      const ax = PW / 2
      doc.save()
      doc.moveTo(ax, doc.y).lineTo(ax, doc.y + 8).lineWidth(1.5).stroke(CYAN)
      doc.moveTo(ax - 4, doc.y + 5).lineTo(ax, doc.y + 11).lineTo(ax + 4, doc.y + 5).fill(CYAN)
      doc.restore()
      doc.y += 14
    }
  })
  doc.y += 4
  const fy = doc.y
  doc.save().roundedRect(BX, fy, BW, BH, 4).fill(CORAL).restore()
  doc.font(FONT_BOLD).fontSize(9.5).fillColor(WHITE)
    .text("COMPLETE", BX, fy + 10, { width: BW, align: "center" })
  doc.y = fy + BH + 12

  // ── 3 ──
  sectionHeading("3", "Creating Projects")

  sub("Method 1 — CRM Opportunity Conversion")
  p("The preferred method for creating projects is via the CRM pipeline. When an opportunity is won:")
  b("Prospect is converted to a Customer (or reuses an existing one)")
  b("A new project is created at P2 / Design status with an auto-generated project number")
  b("Quote lines from the opportunity are migrated into a formal Quote (marked as Accepted)")
  b("Product records are created from each quote line with auto-generated job numbers")
  b("The opportunity is marked as Won and linked to the new project")
  callout("CRM conversion creates the project at Design status with salesStage = Order, skipping Opportunity and Quotation stages since those were handled in the CRM pipeline.")

  sub("Method 2 — Manual Creation")
  p("Projects can also be created manually from the Projects page via the New Project button. The form captures:")
  b("Project name (required)")
  b("Customer, Project Coordinator, Project Manager, Install Manager")
  b("Priority (Normal, High, Critical) and Work Stream (Utility, Bespoke, Community, Blast, Refurbishment)")
  b("Project Type (Standard or Bespoke/Major)")
  b("Work Stream: Community, Utilities, Bespoke, Blast, Bund Containment, or Refurbishment")
  b("Sales Stage (Opportunity, Quoted, Order) and Contract Type (Standard, NEC, Framework Call-off, Other)")
  b("Site location, region, estimated value, key dates, and notes")
  p("A unique project number is auto-generated on creation.")

  // ── 4 ──
  sectionHeading("4", "Project Products")

  sub("Adding Products")
  p("Products are the individual deliverables within a project (e.g. flood gates, blast doors). They can be added from the project detail page using the Add Product dialog.")
  b("Select from the Product Catalogue for pre-defined items, or enter custom part code and description")
  b("Set quantity, assign a designer, assign a coordinator, and set a required completion date")
  b("Each product gets a unique job number (projectNumber-01, projectNumber-02, etc.)")

  sub("Product Department Tracking")
  p("Every product moves through a sequence of departments, tracked by the currentDepartment field:")

  const d1 = 110, d2 = CW - 110
  th(["Department", "Description"], [d1, d2])
  td(["Planning", "Initial planning and appraisal stage"], [d1, d2])
  td(["Design", "Engineering design work in progress"], [d1, d2])
  td(["Production", "Manufacturing on the shop floor"], [d1, d2])
  td(["Installation", "Product shipped and being installed on site"], [d1, d2])
  td(["Review", "Post-installation review and as-built checks"], [d1, d2])
  td(["Complete", "Product fully delivered and signed off"], [d1, d2])
  doc.moveDown(0.4)
  p("Department can be changed directly from the product table by clicking the department badge. This provides a quick, inline way to progress products without opening a separate form.")

  sub("Product Fields")
  p("Each product tracks detailed information across its lifecycle stages:")
  b("Part code, description, additional details, drawing number")
  b("Per-stage dates: planned start, target date, completion date (for design, production, install, ops)")
  b("Estimated hours: design, production, install, ops (drives capacity planning)")
  b("Production sub-stage hours: cutting, fabrication, fitting, shotblasting, painting, packing")
  b("Production status, install status, as-built complete flag")

  // ── 5 ──
  sectionHeading("5", "Project Dashboard & Views")

  sub("Board View (Default)")
  p("The main projects page displays a Kanban board with columns for each project status. Projects appear as cards that can be dragged between columns. The board enforces transition gates:")
  b("Opportunity to Quotation: project must have at least one product")
  b("Design to Design Freeze: all design cards must be Complete")
  b("Manufacture to Installation: all products must have production completed")
  b("Installation to Review: all products must be through production")
  p("Cards show project name, number, customer, assigned manager, product count, priority badges (ICU, Critical, High), and work stream badges (Utility, Bespoke, Community, Blast, Refurbishment).")

  sub("Table View")
  p("A traditional tabular listing of all projects with sortable columns and filters. Useful for searching and bulk reviewing project data.")

  sub("Tracker View")
  p("A cross-project product tracker that lists individual products across all projects in one view. Shows department, production stage, designer, coordinator, design status, install status, due dates, and RAG indicators. Supports filtering by department, production stage, designer, coordinator, and search.")

  sub("Timeline View")
  p("A Gantt-style timeline showing project durations and key milestones. Helps visualise scheduling conflicts and resource bottlenecks across the portfolio.")

  sub("Project Detail Page")
  p("Clicking a project opens its detail page with tabbed sections:")
  b("Products — full product table with department, production status, designer, RAG, handover actions")
  b("Quotes — linked quotes with line items, pricing, and totals")
  b("Overview — lifecycle gate tracker (P0-P5), project details, key dates")
  b("NCRs — non-conformance reports table with raise NCR action")
  b("Variations — change orders with type, status, cost/value impact")
  b("Financials — retention holdbacks, plant hire, sub-contractor work, cost categories")
  b("Design — design cards with job card statuses (when design is active)")
  b("Documents — uploaded project documents organised by product")
  b("Activity — project notes and activity log with note categories (Note, Milestone, Decision, Issue)")

  sub("Financial KPIs")
  p("The project header displays four key financial cards when values are populated:")
  bb("Estimated Value —", "initial estimate before formal quoting")
  bb("Contract Value —", "agreed contract price with the customer")
  bb("Current Cost —", "actual costs incurred to date")
  bb("NCR Cost —", "total cost impact of non-conformance reports (highlighted in red if > 0)")

  sub("RAG Status")
  p("Projects and products use a Red/Amber/Green (RAG) status system for quick visual health checks. Product-level RAG is auto-calculated from the required completion date vs. today. Project-level RAG can be set manually.")

  // ── 6 ──
  sectionHeading("6", "Project Statuses")

  sub("Board Statuses")
  p("These control which Kanban column a project appears in and enforce workflow gates.")

  const s1 = 120, s2 = CW - 120
  th(["Status", "Meaning"], [s1, s2])
  td(["Opportunity", "Early-stage enquiry, not yet formally quoted"], [s1, s2])
  td(["Quotation", "Quote prepared and submitted, awaiting customer decision"], [s1, s2])
  td(["Design", "Order received, design work in progress on products"], [s1, s2])
  td(["Design Freeze", "All design cards complete — no further design changes permitted"], [s1, s2])
  td(["Manufacture", "Design handed over to production, manufacturing active"], [s1, s2])
  td(["Installation", "Products dispatched and being installed on site"], [s1, s2])
  td(["Review", "Post-installation review and project closeout checks"], [s1, s2])
  td(["Complete", "Project fully delivered, invoiced, and archived"], [s1, s2])
  doc.moveDown(0.4)

  sub("Department Status")
  p("Each project also has a department-level sub-status used by departmental boards for their own workflow tracking:")

  th(["Status", "Meaning"], [s1, s2])
  td(["Todo", "Awaiting attention from the department"], [s1, s2])
  td(["Ongoing", "Actively being worked on within the department"], [s1, s2])
  td(["Review", "Work complete, pending departmental review"], [s1, s2])
  td(["Done", "Department has completed their scope of work"], [s1, s2])
  doc.moveDown(0.4)

  sub("Priority & Classification")
  p("Projects are tagged with priority and classification for board filtering and visual emphasis:")
  bb("Priority:", "Normal (default), High (amber badge), Critical (red badge with flame icon)")
  bb("ICU Flag:", "a special escalation flag shown as a red siren badge — indicates the project needs immediate attention")
  bb("Work Stream:", "Utility (blue badge), Bespoke (purple badge), Community (green badge), Blast (orange badge), Refurbishment (teal badge)")

  sub("Work Streams")
  p("Each project belongs to one of MME's work streams, reflecting the type of engineering work:")
  b("Community — community flood defence schemes")
  b("Utilities — utility sector flood protection (core bread & butter work)")
  b("Bespoke — custom/one-off engineered solutions")
  b("Blast — blast-resistant doors, windows, and structures")
  b("Bund Containment — bund wall and containment solutions")
  b("Refurbishment — maintenance and refurbishment of existing installations")

  // ── 7 ──
  sectionHeading("7", "NCR Management")

  sub("What is an NCR?")
  p("A Non-Conformance Report (NCR) documents any deviation from expected quality standards — a defect, error, or failure identified during design, production, or installation. NCRs are critical for tracking quality issues, their cost impact, and corrective actions.")

  sub("Raising an NCR")
  p("NCRs are raised from the project detail page via the Raise NCR dialog. Required fields:")
  b("Title — brief description of the non-conformance (required)")
  b("Product — optionally link to a specific product, or leave blank for a project-level NCR")
  b("Severity — Minor, Major, or Critical")
  b("Cost Impact — estimated financial impact in GBP")
  b("Description — detailed description of the issue")
  b("Require Design Rework — checkbox to trigger design card rework (only shown when the product has a design card)")

  sub("NCR Severity Levels")
  const n1 = 90, n2 = CW - 90
  th(["Severity", "Description"], [n1, n2])
  td(["Minor", "Low-impact issue, can be addressed with minor rework or concession"], [n1, n2])
  td(["Major", "Significant deviation requiring formal investigation and corrective action"], [n1, n2])
  td(["Critical", "Safety-critical or showstopper — immediate escalation and containment required"], [n1, n2])
  doc.moveDown(0.4)

  sub("NCR Status Lifecycle")
  th(["Status", "Meaning"], [n1, n2])
  td(["Open", "NCR raised, awaiting investigation"], [n1, n2])
  td(["Investigating", "Root cause analysis and corrective action planning underway"], [n1, n2])
  td(["Resolved", "Corrective action completed, awaiting verification"], [n1, n2])
  td(["Closed", "NCR verified and formally closed out"], [n1, n2])
  doc.moveDown(0.4)

  sub("Root Cause Categories")
  p("When investigating an NCR, a root cause category is assigned:")
  bb("Design Error —", "mistake in drawings, specifications, or BOM")
  bb("Production Error —", "manufacturing defect or process failure")
  bb("Material Defect —", "faulty or sub-standard material supplied")
  bb("Other —", "any cause not covered above")

  sub("NCR and Design Rework")
  p("When an NCR requires design changes, the system triggers a rework cycle:")
  b("NCR raised with Require Design Rework checkbox ticked")
  b("Affected design card job cards are reset to In Progress / Ready")
  b("Design Card reverts to In Progress")
  b("Any acknowledged handover reverts to Draft")
  b("Design team completes rework and resubmits the handover")
  callout("NCR cost impact is tracked separately on the project and shown as a red-highlighted financial card on the project detail page.")

  // ── 8 ──
  sectionHeading("8", "Variations & Change Orders")

  sub("What is a Variation?")
  p("A variation (also called a change order) records any change to the original project scope, whether initiated by the client, discovered on site, or arising from design changes. Variations track both cost impact (what it costs MME) and value impact (what is charged to the client).")

  sub("Variation Types")
  const v1 = 130, v2 = CW - 130
  th(["Type", "Description"], [v1, v2])
  td(["Client Instruction", "Change requested or instructed by the customer"], [v1, v2])
  td(["Design Change", "Change arising from engineering design review"], [v1, v2])
  td(["Site Condition", "Unforeseen condition discovered on site during installation"], [v1, v2])
  td(["Scope Change", "Modification to the agreed scope of work"], [v1, v2])
  td(["Omission", "Item originally included but now removed from scope"], [v1, v2])
  td(["Addition", "New item added to the project scope"], [v1, v2])
  doc.moveDown(0.4)

  sub("Variation Status Lifecycle")
  th(["Status", "Meaning"], [v1, v2])
  td(["Pending", "Variation identified, awaiting formal submission"], [v1, v2])
  td(["Submitted", "Variation formally submitted for approval"], [v1, v2])
  td(["Approved", "Approved by the relevant authority (client or internal)"], [v1, v2])
  td(["Rejected", "Variation rejected — scope change not proceeding"], [v1, v2])
  td(["Implemented", "Approved variation has been executed in the project"], [v1, v2])
  doc.moveDown(0.4)

  sub("Variation Tracking")
  p("The variations tab on the project detail page shows all variations with:")
  b("Unique variation number (auto-generated)")
  b("Title, description, type badge, and status badge")
  b("Cost impact and value impact in GBP")
  b("Date raised")
  p("A summary footer shows total variation count, total cost impact, and total value impact across all variations on the project.")

  // ── 9 ──
  sectionHeading("9", "Installation")

  sub("Moving to Installation")
  p("A project enters the Installation phase when it is moved from the Manufacture column to Installation on the Kanban board. The system enforces a gate:")
  b("All products must have completed production (reached Packing or Completed stage)")
  b("If any products still have outstanding production work, the move is blocked with a message directing the user to the Production board")

  sub("Install Manager Assignment")
  p("Each project can have a dedicated Install Manager assigned, separate from the Project Manager. The Install Manager is responsible for coordinating on-site activities and is set during project creation or editing.")

  sub("Product Install Tracking")
  p("Each product tracks installation progress independently with:")
  b("Install planned start date")
  b("Install target date")
  b("Install completion date")
  b("Install status")
  b("Install estimated hours (used for capacity planning)")
  p("Products in the Installation department are visible on the Tracker view with their install status column.")

  sub("Installation Phase Activities")
  p("During installation, the project team typically:")
  b("Coordinates delivery logistics and site access")
  b("Manages plant hire (tracked in the Financials tab with supplier, dates, weekly rate, and total cost)")
  b("Oversees sub-contractor work (tracked with supplier, product link, agreed value, and invoiced amounts)")
  b("Records any site-condition variations that arise")
  b("Tracks installation progress per product via department status updates")
  b("Documents installation evidence via the Documents tab")

  sub("Moving to Review")
  p("Once installation is complete, the project moves to the Review column. The system gate requires:")
  b("All products must be through production (Packing or Complete stage)")
  b("Installation sign-off should be confirmed on the project page")
  callout("Plant hire and sub-contractor costs are tracked in the Financials tab and contribute to the project's total current cost.")

  // ── 10 ──
  sectionHeading("10", "Project Completion")

  sub("Review Phase")
  p("After installation, the project enters Review status. This is the final quality and closeout phase:")
  b("As-built documentation is verified (each product has an asBuiltComplete flag)")
  b("Review completed date is recorded per product")
  b("Outstanding NCRs are closed out")
  b("Variations are finalised and marked as Implemented or Rejected")
  b("Financial reconciliation: compare contract value against actual costs")
  b("Retention holdbacks are recorded with percentage, amount, release date, and status (Held, Partially Released, Released)")

  sub("Completing a Project")
  p("A project moves to Complete status as the final step. On completion:")
  b("All products should be in the Complete department")
  b("Actual completion date is recorded")
  b("The project drops off the active Kanban board (board shows non-complete projects only)")
  b("Project data remains fully accessible for reporting and audit")

  sub("Financial Closeout")
  p("The Financials tab provides a comprehensive view for closeout:")
  bb("Retention Holdbacks —", "track retention percentage, amount, release dates, and release status")
  bb("Plant Hire —", "review all plant hire costs with supplier, duration, weekly rate, and total")
  bb("Sub-Contractor Work —", "reconcile sub-contract agreed values against invoiced amounts")
  bb("Cost Categories —", "budget vs committed vs actual costs per cost code")
  bb("Sales Invoices —", "linked invoices for the project")

  sub("Audit Trail")
  p("All project changes are recorded in the audit log. The Activity tab on the project detail page shows:")
  b("Project notes categorised as Note, Milestone, Decision, or Issue")
  b("Pinnable notes for key decisions that need to stay visible")
  b("Full audit log of status changes, field updates, and system events")
  callout("ETHOS maintains a complete audit trail for every project. All status transitions, field changes, and key actions are logged with timestamps and user attribution.")

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
      .text("ETHOS Projects v1.0", PW - R - 140, 34, { width: 140, align: "right", height: 12 })

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
