/**
 * Generate CRM & Quoting SOP PDF
 * Uses the actual MME coral logo + PX Grotesk brand font
 * Usage: npx tsx scripts/generate-sop-crm.ts
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
      Title: "ETHOS — CRM & Quoting SOP",
      Author: "MM Engineered Solutions",
      Subject: "ETHOS CRM & Quoting SOP v1.0",
    },
  })

  const out = path.join(__dirname, "..", "ETHOS-CRM-Quoting-SOP.pdf")
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
    .text("CRM & Quoting", 0, doc.y, { width: PW, align: "center" })
  doc.moveDown(0.2)
  doc.font(FONT_LIGHT).fontSize(18).fillColor(CORAL)
    .text("ETHOS System Guide", 0, doc.y, { width: PW, align: "center" })

  doc.y = 540
  doc.font(FONT_LIGHT).fontSize(10).fillColor("#ffffff80")
    .text("ETHOS ERP  |  CRM & Quoting Module", 0, doc.y, { width: PW, align: "center" })
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
    "2.  Prospects & Companies",
    "3.  Opportunities & Pipeline Stages",
    "4.  Quoting — Line Items, Costs & Margin",
    "5.  Product Configuration (CTO & ETO)",
    "6.  Quote Approval & Sending",
    "7.  Converting to Project",
    "8.  Pipeline Views",
    "9.  Status & Enum Reference",
    "10.  Where to Find Things",
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
  p("The ETHOS CRM & Quoting module manages the full sales lifecycle — from first contact with a prospective customer through to a won opportunity that converts into a live project with products, quotes, and design work.")
  p("The module is built around three core entities: Prospects (companies), Opportunities (individual sales leads against a prospect), and Quote Lines (the products and services being priced). Together these form a visual pipeline that the sales and estimating team use to track every active deal.")
  p("Key capabilities include:")
  b("Track prospects with company, contact, sector, and lead source information")
  b("Create and manage multiple opportunities per prospect")
  b("Build detailed quotes with configured products (CTO and ETO), manual items, and activities")
  b("Calculate pricing with R&D costs, risk costs, and margin percentages")
  b("Submit quotes for approval with automatic quote number generation")
  b("Director-level approval gates for ETO (Engineer to Order) quotes")
  b("Convert won opportunities into live projects with auto-generated products and formal quotes")
  b("Drag-and-drop pipeline board for visual sales management")

  // ── 2 ──
  sectionHeading("2", "Prospects & Companies")

  sub("What Is a Prospect?")
  p("A Prospect represents a potential customer company in the CRM. Prospects are the top-level container — each prospect can have multiple opportunities (deals) associated with it. When a prospect's opportunity is won and converted, the prospect becomes a formal Customer record.")

  sub("Creating a Prospect")
  p("Click New Prospect from the CRM Pipeline page. The following fields are available:")
  bb("Company Name —", "required. The company or organisation name.")
  bb("Contact Name —", "primary contact at the company.")
  bb("Email / Phone —", "contact details for the primary contact.")
  bb("Sector —", "industry sector: Defence, Utilities, Construction, Energy, Transport, Water, or Other.")
  bb("Lead Source —", "how this prospect was acquired: Referral, Website, Trade Show, Cold Call, Repeat Business, Tender Portal, or Other.")
  bb("Address —", "full company address.")
  bb("Notes —", "any additional context or information.")

  sub("Prospect Statuses")
  const ps1 = 120, ps2 = CW - 120
  th(["Status", "Meaning"], [ps1, ps2])
  td(["Active", "Prospect is being actively pursued — has live opportunities"], [ps1, ps2])
  td(["Converted", "At least one opportunity has been won and converted to a project/customer"], [ps1, ps2])
  td(["Inactive", "No longer being pursued"], [ps1, ps2])
  td(["Disqualified", "Ruled out as a viable prospect"], [ps1, ps2])
  doc.moveDown(0.4)

  sub("Prospect Detail Page")
  p("Click a prospect name to view their detail page. This shows all contact information, lead source, pipeline value (sum of all opportunity values), won value, and a full table of all their opportunities with status, close date, and conversion links.")
  callout("When a prospect is converted, a link to the resulting Customer record appears in the header — click it to view the customer.")

  // ── 3 ──
  sectionHeading("3", "Opportunities & Pipeline Stages")

  sub("What Is an Opportunity?")
  p("An Opportunity represents a specific sales lead or deal against a prospect. Each opportunity tracks its own value, contact person, expected close date, win probability, and status as it moves through the pipeline. Opportunities are where quotes are built.")

  sub("Creating an Opportunity (New Lead)")
  p("Click New Lead from the CRM Pipeline page. Fields include:")
  bb("Prospect —", "required. Select the parent prospect (company) from the dropdown.")
  bb("Lead / Opportunity Name —", "required. Descriptive name for this deal (e.g. 'Steel Fabrication - Phase 2').")
  bb("Estimated Value —", "expected deal value in GBP.")
  bb("Expected Close Date —", "when the deal is expected to close.")
  bb("Contact Person —", "the specific contact for this opportunity.")
  bb("Notes —", "additional detail.")

  sub("Opportunity Statuses (Pipeline Stages)")
  p("Opportunities progress through the following stages. Status can change automatically via workflow actions or manually via drag-and-drop on the pipeline board.")
  const o1 = 140, o2 = CW - 140
  th(["Status", "Description"], [o1, o2])
  td(["Active Lead", "New lead, being qualified and pursued"], [o1, o2])
  td(["Pending Approval", "Quote has been submitted and is awaiting internal approval"], [o1, o2])
  td(["Quoted", "Quote approved and sent or ready to send to the customer"], [o1, o2])
  td(["Won", "Customer accepted — ready to convert to a project"], [o1, o2])
  td(["Lost", "Opportunity lost to a competitor or cancelled"], [o1, o2])
  td(["Dead Lead", "Lead closed with a reason (can be revived)"], [o1, o2])
  doc.moveDown(0.4)

  sub("Win Probability")
  p("Each opportunity has a win probability percentage (0-100%). This is auto-set when the stage changes but can be manually overridden. The pipeline view uses this to calculate weighted pipeline value — giving a more realistic forecast than raw totals.")

  sub("Dead Leads & Revival")
  p("When a lead is closed (moved to Dead Lead), a reason must be provided. Available reasons include: No budget, Went with competitor, Project cancelled, No response, Not a fit, or Other (with free text). Dead leads can be revived back to Active Lead status. The system tracks the full dead/revive history for each opportunity.")

  // ── 4 ──
  sectionHeading("4", "Quoting — Line Items, Costs & Margin")

  sub("Accessing the Quote Builder")
  p("From the pipeline board, click on any opportunity and select the quote/edit option, or navigate to /crm/quote/[opportunityId]. The Quote Builder is the central tool for building and pricing a quote.")

  sub("Line Item Types")
  p("The quote builder supports three types of line item:")
  bb("Product —", "a configured product from the catalogue. Added via the CTO Product or ETO Product buttons. Includes dimensions, configuration, and computed pricing from the BOM engine.")
  bb("Manual —", "a freeform line item with description, quantity, and unit cost entered directly. Used for non-catalogue items.")
  bb("Activity —", "services, installation, transport, or other non-product charges.")

  sub("Line Item Table")
  p("Each line item displays: type badge, classification (CTO or ETO), description, quantity, unit cost, and total. Click any row to edit it. ETO lines are highlighted in orange. The table footer shows the items subtotal.")

  sub("Additional Costs")
  p("Below the line items table, additional costs are entered:")
  bb("R&D Cost —", "research and development costs specific to this quote.")
  bb("Risk Cost —", "contingency or risk allowance.")
  p("These are added to the line items subtotal before margin is applied.")

  sub("Margin & Quoted Price")
  p("The margin percentage is applied on top of the base cost (line items + R&D + risk). The formula is:")
  p("Quoted Price = (Line Items Total + R&D Cost + Risk Cost) x (1 + Margin%/100)")
  p("Costs and margin auto-save on blur — no need to click a save button.")
  callout("The quoted price is recalculated server-side whenever costs are updated, ensuring consistency between the UI and database.")

  sub("Lifting Plan")
  p("Each opportunity can have a project-level lifting plan capturing:")
  b("Lifting plan status: Yes / No / TBC")
  b("Estimated weight (kg) — auto-calculated from configured products")
  b("Maximum lift height (metres)")
  b("Crane required: Yes / No / TBC")
  b("Site access notes")
  b("Lifting plan cost")
  b("Delivery notes")

  // ── 5 ──
  sectionHeading("5", "Product Configuration (CTO & ETO)")

  sub("Overview")
  p("The CRM product builder allows sales/estimating to configure products directly within the quote. Products are categorised into two classifications:")
  bb("CTO (Configure to Order) —", "standard products with predefined options. Dimensions, handing, lock, finish, and features are selected from catalogued options. Cost is computed from the BOM engine.")
  bb("ETO (Engineer to Order) —", "bespoke products requiring engineering design. Same configuration steps but flagged for director-level approval. ETO lines appear with an orange badge and icon.")

  sub("Configuration Steps")
  p("The product builder walks through a multi-step configurator:")
  b("Step 1: Select product family and type from the catalogue")
  b("Step 2: Dimensions — width, height, depth, leaf count, opening direction, clear opening, structural opening")
  b("Step 3: Lock configuration — lock type, brand, model, cylinder, handle, keyed-alike grouping")
  b("Step 4: Finish — coating standard, paint system, RAL colour, galvanising, DFT, surface area")
  b("Step 5: Features — transome, vent configuration, feature tags (e.g. fire rating, marine grade)")
  b("Step 6: Lifting — per-product weight, lift height, crane requirement")

  sub("Computed BOM & Cost")
  p("For CTO products linked to a catalogue variant, the system computes a Bill of Materials and unit cost from the BOM engine. This computed cost is stored alongside the line and used as the default unit cost. Estimators can override it if needed.")
  callout("ETO products may not have computed costs if no BOM template exists — the estimator must enter costs manually or mark them for engineering review.")

  // ── 6 ──
  sectionHeading("6", "Quote Approval & Sending")

  sub("Quote Approval Workflow")
  p("Quotes move through a formal approval workflow before they can be sent to customers.")

  subsub("Step 1 — Draft")
  p("When a quote is first created, it starts in Draft status. The estimator builds line items, sets costs and margin. The quote is editable.")

  subsub("Step 2 — Submit for Approval")
  p("Click Submit for Approval. The system validates that at least one line item exists, then:")
  b("Auto-generates a quote number in QUO-YYYY-NNNN format (e.g. QUO-2026-0001)")
  b("Sets the approval status to Pending Approval")
  b("Moves the opportunity status to Pending Approval")
  b("The quote becomes locked — no edits while pending")

  subsub("Step 3 — Approve or Reject")
  p("An authorised user reviews the quote.")

  bb("Approve —", "sets approval to Approved, moves opportunity to Quoted status, and updates the estimated value to match the quoted price.")
  bb("Reject —", "sets approval to Rejected, returns opportunity to Pending Approval. The estimator can revise and resubmit.")
  callout("Quotes containing ETO lines require Director-level approval (Managing Director, Technical Director, Sales Director, or Admin). Standard CTO quotes can be approved by any authorised user.")

  sub("Marking as Sent")
  p("After approval, the quote can be marked as sent to the customer. Click Mark as Sent and enter the recipient. The system records:")
  b("quoteSentAt — timestamp of when the quote was sent")
  b("quoteSentTo — name or email of the recipient")
  p("A green 'Sent' badge appears in the quote header once marked.")

  sub("Quote Approval Statuses")
  const a1 = 140, a2 = CW - 140
  th(["Status", "Meaning"], [a1, a2])
  td(["Draft", "Quote is being built — fully editable"], [a1, a2])
  td(["Pending Approval", "Submitted, awaiting review — locked from editing"], [a1, a2])
  td(["Approved", "Quote approved — can be sent to customer"], [a1, a2])
  td(["Rejected", "Reviewer rejected — estimator can revise and resubmit"], [a1, a2])

  // ── 7 ──
  sectionHeading("7", "Converting to Project")

  sub("Overview")
  p("When an opportunity is marked as Won, it can be converted into a live ETHOS project. This is the bridge between CRM (sales) and the operational modules (design, production, installation). Conversion is a one-click action that creates multiple linked records.")

  sub("The Conversion Process")
  p("Click Convert to Project on a Won opportunity. The system performs the following steps in sequence:")

  subsub("Step 1 — Create or Reuse Customer")
  b("If the prospect has not been converted before, a new Customer record is created from the prospect's company name, email, phone, and address")
  b("The prospect status is updated to Converted")
  b("If the prospect was previously converted, the existing Customer is reused")

  subsub("Step 2 — Generate Project Number")
  b("An auto-incrementing project number is generated (e.g. 100001, 100002, ...)")
  b("The numbering continues from the highest existing project number in the database")

  subsub("Step 3 — Create Project")
  b("A new Project is created at lifecycle stage P2 / Design status")
  b("Project name matches the opportunity name")
  b("Contract value is set from the quoted price (or estimated value as fallback)")
  b("Order received date is set to the conversion date")

  subsub("Step 4 — Migrate Quote Lines")
  p("If the opportunity has quote lines, a formal Quote record is created:")
  b("Quote number generated in Q-NNNN format (e.g. Q-1001)")
  b("Status set to Accepted")
  b("Total cost and sell price calculated from the opportunity's line items and margin")
  b("Each OpportunityQuoteLine becomes a QuoteLine with dimensions, costs, and specs")
  b("For configured products (those with a catalogue variant), a QuoteLineSpec is created preserving the full specification, BOM, and computed cost")

  subsub("Step 5 — Create Products")
  b("One Product record is created on the project for each quote line")
  b("Product job numbers follow the pattern: [projectNumber]-01, -02, etc.")
  b("Part codes are looked up from the catalogue variant's Sage stock code")
  b("Catalogue item links are preserved for BOM and specification reference")
  b("Dimensions are carried across as additional details")

  subsub("Step 6 — Update Opportunity")
  b("Opportunity status set to WON")
  b("Converted project ID linked")
  b("Conversion timestamp recorded")
  b("Audit log entries created for the Customer, Quote, and Project")

  callout("Conversion revalidates the /design, /projects, and /crm pages so the new project appears immediately on all boards.")

  // ── 8 ──
  sectionHeading("8", "Pipeline Views")

  sub("Three Views")
  p("The CRM page offers three views, switchable via tabs at the top of the page. The default view is Pipeline.")

  subsub("Pipeline View (Default)")
  p("A Kanban-style board with columns for each opportunity status: Active Lead, Pending Approval, Quoted, Won, and Lost. Dead Leads are grouped separately.")
  b("Each card shows the opportunity name, company, value, win probability, contact, and quote status")
  b("Column headers show the total value and weighted value (value x probability)")
  b("Drag and drop opportunities between columns to change status")
  b("Moving to Dead Lead prompts for a reason")
  b("Cards can be expanded to show quote lines and take actions (edit quote, convert, mark as sent)")
  b("Won cards with a converted project show a link to the project")

  subsub("Board View (by Customer)")
  p("Groups opportunities by prospect (company). Each prospect appears as a column with its opportunities listed as cards beneath. Useful for seeing all deals per customer at a glance.")
  b("Shows summary stats: Active Leads, Quoted, Won counts, and total Pipeline Value")
  b("Prospects can be renamed inline")
  b("Drag opportunities between prospect columns to reassign")
  b("Filter by opportunity status")
  b("Click an opportunity card to edit its details")

  subsub("Table View")
  p("A filterable, sortable table listing all opportunities with columns for: name, company, status, lead source, contact, close date, estimated value, and converted project link.")
  b("Filter by status, lead source, or free-text search")
  b("Search covers opportunity name, contact person, company name, and notes")
  b("Results show total pipeline value for the filtered set")

  // ── 9 ──
  sectionHeading("9", "Status & Enum Reference")

  sub("Opportunity Status")
  const e1 = 140, e2 = CW - 140
  th(["Enum Value", "Display Label"], [e1, e2])
  td(["DEAD_LEAD", "Dead Lead — closed with reason, can be revived"], [e1, e2])
  td(["ACTIVE_LEAD", "Active Lead — being pursued"], [e1, e2])
  td(["PENDING_APPROVAL", "Pending Approval — quote submitted for review"], [e1, e2])
  td(["QUOTED", "Quoted — approved and sent/ready to send"], [e1, e2])
  td(["WON", "Won — customer accepted, ready to convert"], [e1, e2])
  td(["LOST", "Lost — deal lost"], [e1, e2])
  doc.moveDown(0.4)

  sub("Quote Approval Status")
  th(["Enum Value", "Meaning"], [e1, e2])
  td(["DRAFT", "Quote being built — editable"], [e1, e2])
  td(["PENDING_APPROVAL", "Submitted for review — locked"], [e1, e2])
  td(["APPROVED", "Approved by reviewer"], [e1, e2])
  td(["REJECTED", "Rejected — needs revision"], [e1, e2])
  doc.moveDown(0.4)

  sub("Quote Line Classification")
  th(["Enum Value", "Meaning"], [e1, e2])
  td(["STANDARD", "Standard catalogue product (legacy, treated as CTO)"], [e1, e2])
  td(["CTO", "Configure to Order — standard product with options"], [e1, e2])
  td(["ENGINEER_TO_ORDER", "Engineer to Order — bespoke, requires director approval"], [e1, e2])
  doc.moveDown(0.4)

  sub("Line Item Type")
  th(["Enum Value", "Meaning"], [e1, e2])
  td(["PRODUCT", "Configured product from the catalogue"], [e1, e2])
  td(["ACTIVITY", "Service, installation, or other activity"], [e1, e2])
  td(["MANUAL", "Freeform line item with manual pricing"], [e1, e2])
  doc.moveDown(0.4)

  sub("Lead Source")
  const l1 = 140, l2 = CW - 140
  th(["Enum Value", "Display Label"], [l1, l2])
  td(["REFERRAL", "Referral"], [l1, l2])
  td(["WEBSITE", "Website"], [l1, l2])
  td(["TRADE_SHOW", "Trade Show"], [l1, l2])
  td(["COLD_CALL", "Cold Call"], [l1, l2])
  td(["REPEAT_BUSINESS", "Repeat Business"], [l1, l2])
  td(["TENDER_PORTAL", "Tender Portal"], [l1, l2])
  td(["OTHER", "Other"], [l1, l2])
  doc.moveDown(0.4)

  sub("Prospect Status")
  th(["Enum Value", "Meaning"], [l1, l2])
  td(["ACTIVE", "Being actively pursued"], [l1, l2])
  td(["INACTIVE", "No longer active"], [l1, l2])
  td(["CONVERTED", "Converted to a customer record"], [l1, l2])
  td(["DISQUALIFIED", "Ruled out"], [l1, l2])

  // ── 10 ──
  sectionHeading("10", "Where to Find Things")
  const n1 = 180, n2 = CW - 180
  th(["Feature", "Location"], [n1, n2])
  td(["CRM Pipeline (default view)", "/crm — Pipeline tab"], [n1, n2])
  td(["Board view (by customer)", "/crm?view=board"], [n1, n2])
  td(["Table view (filterable list)", "/crm?view=table"], [n1, n2])
  td(["Prospect detail page", "/crm/[prospectId]"], [n1, n2])
  td(["Quote builder", "/crm/quote/[opportunityId]"], [n1, n2])
  td(["New Prospect dialog", "CRM page > New Prospect button"], [n1, n2])
  td(["New Lead dialog", "CRM page > New Lead button"], [n1, n2])
  td(["Convert to Project", "Pipeline > Won card > Convert to Project"], [n1, n2])
  td(["Mark Quote as Sent", "Quote Builder > Mark as Sent"], [n1, n2])
  td(["Dead Lead / Close Lead", "Pipeline > drag to Dead Lead column"], [n1, n2])
  td(["Revive Dead Lead", "Pipeline > Dead Lead card > Revive button"], [n1, n2])

  doc.moveDown(0.6)

  // ── Pipeline Flow Diagram ──
  ensureSpace(220)
  sub("CRM Lifecycle Flow")
  doc.moveDown(0.3)

  const chain = [
    { label: "PROSPECT", note: "Company created in CRM" },
    { label: "ACTIVE LEAD", note: "Opportunity created, being qualified" },
    { label: "QUOTE BUILT", note: "Products configured, costs & margin set" },
    { label: "PENDING APPROVAL", note: "Submitted for internal review" },
    { label: "QUOTED", note: "Approved, sent to customer" },
    { label: "WON", note: "Customer accepted the quote" },
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
  const fy = doc.y
  doc.save().roundedRect(BX, fy, BW, BH, 4).fill(CORAL).restore()
  doc.font(FONT_BOLD).fontSize(9.5).fillColor(WHITE)
    .text("CONVERT TO PROJECT", BX, fy + 10, { width: BW, align: "center" })
  doc.y = fy + BH + 12

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
      .text("ETHOS CRM & Quoting v1.0", PW - R - 140, 34, { width: 140, align: "right", height: 12 })

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
