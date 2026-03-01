import PDFDocument from "pdfkit"
import fs from "fs"
import path from "path"

const OUTPUT = path.resolve("ETHOS_MK1_Handbook.pdf")

const C = {
  primary: "#1e3a5f",
  accent: "#2563eb",
  body: "#374151",
  muted: "#6b7280",
  light: "#f0f0f0",
  white: "#ffffff",
  amber: "#d97706",
}

const doc = new PDFDocument({
  size: "A4",
  margins: { top: 50, bottom: 50, left: 55, right: 55 },
  info: {
    Title: "ETHOS MK.I — Software Handbook",
    Author: "MM Engineered Solutions Ltd",
  },
})

const stream = fs.createWriteStream(OUTPUT)
doc.pipe(stream)

const W = doc.page.width - 110 // usable width

// Simple helpers
function section() { doc.addPage() }
function gap(n = 0.4) { doc.moveDown(n) }

function title(t: string) {
  doc.fontSize(20).font("Helvetica-Bold").fillColor(C.primary).text(t)
  gap(0.2)
  doc.moveTo(55, doc.y).lineTo(55 + W, doc.y).strokeColor(C.accent).lineWidth(1.5).stroke()
  gap(0.6)
  doc.font("Helvetica").fillColor(C.body).fontSize(10)
}

function h2(t: string) {
  gap(0.5)
  doc.fontSize(13).font("Helvetica-Bold").fillColor(C.primary).text(t)
  gap(0.2)
  doc.font("Helvetica").fillColor(C.body).fontSize(10)
}

function h3(t: string) {
  gap(0.3)
  doc.fontSize(11).font("Helvetica-Bold").fillColor(C.accent).text(t)
  gap(0.15)
  doc.font("Helvetica").fillColor(C.body).fontSize(10)
}

function p(t: string) {
  doc.fontSize(10).font("Helvetica").fillColor(C.body).text(t, { lineGap: 2.5 })
  gap(0.2)
}

function b(t: string) {
  doc.fontSize(10).font("Helvetica").fillColor(C.body).text(`  •  ${t}`, { lineGap: 2, indent: 10 })
}

function kv(k: string, v: string) {
  doc.fontSize(10).font("Helvetica-Bold").fillColor(C.primary).text(k, { continued: true })
  doc.font("Helvetica").fillColor(C.body).text(` ${v}`)
}

function simpleTable(headers: string[], rows: string[][]) {
  const colW = W / headers.length
  // Header
  let y = doc.y
  headers.forEach((h, i) => {
    doc.rect(55 + i * colW, y, colW, 18).fill(C.primary)
    doc.fontSize(8).font("Helvetica-Bold").fillColor(C.white)
      .text(h, 55 + i * colW + 3, y + 4, { width: colW - 6, lineBreak: false })
  })
  doc.x = 55; doc.y = y + 19
  // Rows
  rows.forEach((row, ri) => {
    y = doc.y
    const bg = ri % 2 === 0 ? C.light : C.white
    row.forEach((cell, ci) => {
      doc.rect(55 + ci * colW, y, colW, 16).fill(bg)
      doc.fontSize(8).font("Helvetica").fillColor(C.body)
        .text(cell, 55 + ci * colW + 3, y + 3, { width: colW - 6, lineBreak: false })
    })
    doc.x = 55; doc.y = y + 16
  })
  gap(0.4)
}

function tip(t: string) {
  gap(0.2)
  const y = doc.y
  doc.rect(55, y, W, 30).fill("#eff6ff")
  doc.rect(55, y, 3, 30).fill(C.accent)
  doc.fontSize(8).font("Helvetica-Bold").fillColor(C.accent).text("TIP: ", 65, y + 4, { continued: true })
  doc.font("Helvetica").fillColor(C.body).text(t, { width: W - 20 })
  doc.x = 55; doc.y = y + 34
}

function warn(t: string) {
  gap(0.2)
  const y = doc.y
  doc.rect(55, y, W, 30).fill("#fef3c7")
  doc.rect(55, y, 3, 30).fill(C.amber)
  doc.fontSize(8).font("Helvetica-Bold").fillColor(C.amber).text("IMPORTANT: ", 65, y + 4, { continued: true })
  doc.font("Helvetica").fillColor(C.body).text(t, { width: W - 20 })
  doc.x = 55; doc.y = y + 34
}

// ══════════════════════════════════════════════════════
// COVER PAGE
// ══════════════════════════════════════════════════════

doc.rect(0, 0, doc.page.width, 300).fill(C.primary)
doc.fontSize(42).fillColor(C.white).font("Helvetica-Bold").text("ETHOS MK.I", 55, 90)
doc.fontSize(16).fillColor("#93c5fd").font("Helvetica").text("Software Handbook", 55, 145)
gap(1)
doc.fontSize(11).fillColor("#d1d5db")
doc.text("MM Engineered Solutions Ltd", 55, 195)
doc.text("Engineer-to-Order Business Management System", 55, 212)
doc.text("February 2026 — Version 1.0", 55, 240)

doc.fontSize(11).fillColor(C.body).font("Helvetica")
doc.text("This handbook covers:", 55, 350)
gap(0.3)
const items = [
  "CRM Pipeline & Quote Builder",
  "Project Lifecycle Management (P0–P5)",
  "Design Kanban & Job Card Workflow",
  "Production Dashboard & Workshop",
  "Planning & ATP Calculator",
  "Finance, Invoicing & Sage Export",
  "Capacity Planning & Reports",
]
items.forEach(i => { doc.fontSize(11).fillColor(C.accent).text(`  ▸  ${i}`, 65) })

doc.fontSize(8).fillColor(C.muted).text("Confidential — for internal use only", 55, doc.page.height - 70)

// ══════════════════════════════════════════════════════
// TABLE OF CONTENTS
// ══════════════════════════════════════════════════════

section()
title("Table of Contents")

const toc = [
  "System Overview", "Getting Started", "Dashboard", "CRM Pipeline & Sales",
  "Quote Builder", "Projects", "Product Tracker", "Design Module",
  "Production & Workshop", "Planning & ATP", "Finance",
  "Customers & Suppliers", "Catalogue & BOM Library", "Team & User Roles",
  "Data Import", "Reports & Capacity", "Common Workflows", "Quick Reference",
]
toc.forEach((label, i) => {
  doc.fontSize(11).font("Helvetica-Bold").fillColor(C.primary).text(`${i + 1}.`, { continued: true, width: 25 })
  doc.font("Helvetica").fillColor(C.body).text(`  ${label}`)
  gap(0.05)
})

// ══════════════════════════════════════════════════════
// 1. SYSTEM OVERVIEW
// ══════════════════════════════════════════════════════

section()
title("1. System Overview")

p("ETHOS (Engineer-to-Order Hub & Operations System) is a bespoke business management platform built for MM Engineered Solutions. It tracks the complete lifecycle of engineering projects from enquiry through design, production, installation, and close.")

h2("What ETHOS Replaces")
b("Excel tracker spreadsheets for product management")
b("Manual quote spreadsheets and emailed pricing")
b("Disconnected project folders across drives")
b("Scattered financial data across Sage and spreadsheets")
b("Paper-based design handover processes")
b("Whiteboard production scheduling")

h2("Key Concepts")
gap(0.2)
kv("Project:", "A job for a customer with a unique project number (e.g. 200598)")
kv("Product:", "A line item within a project (e.g. a flood door, blast door). Moves through departments.")
kv("Opportunity:", "A potential deal in the CRM pipeline before it becomes a project.")
kv("Quote:", "A priced proposal with line items, margins, and approval workflow.")
kv("Lifecycle Gates (P0–P5):", "Stage gates from Enquiry to Handover/Close.")
kv("Design Card:", "A work package for a product in design with job cards for each task.")
kv("Production Task:", "A workshop task for manufacturing through cutting, welding, painting, etc.")

h2("Technology")
p("Next.js 15, TypeScript, Prisma 7, PostgreSQL (Neon cloud), Tailwind CSS, shadcn/ui. Hosted on Vercel with auto-deployments from GitHub.")

// ══════════════════════════════════════════════════════
// 2. GETTING STARTED
// ══════════════════════════════════════════════════════

section()
title("2. Getting Started")

h2("Logging In")
p("Navigate to the ETHOS URL. Enter your email and password on the login screen.")
tip("Default password for seeded accounts is 'password123'. Change this on first login.")

h2("Navigation")
p("The sidebar on the left contains all main sections:")
b("Dashboard — Business overview with KPIs and charts")
b("CRM — Sales pipeline, prospects, and quote management")
b("Projects — Project list and detail pages")
b("Design — Design Kanban board and job tracking")
b("Production — Workshop dashboard and task management")
b("Planning — ATP calculator and capacity planning")
b("Quotes — Formal quote documents")
b("Purchasing — Purchase order management")
b("Finance — Invoicing, job costing, nominal codes, Sage export")
b("Customers & Suppliers — Contact databases")
b("Catalogue — Product reference data and BOM templates")
b("Team — User management and role assignment")

h2("First-Time Setup Order")
b("1. Team — Add users (estimators, coordinators, designers, production managers)")
b("2. Nominal Codes — Set up cost codes to match Sage Chart of Accounts")
b("3. Customers — Add your customer list (or import from CSV)")
b("4. Suppliers — Add your supplier list")
b("5. Catalogue — Add standard products with guide pricing")
b("6. Import — Bulk-load existing data if migrating from another system")

// ══════════════════════════════════════════════════════
// 3. DASHBOARD
// ══════════════════════════════════════════════════════

section()
title("3. Dashboard")

p("The dashboard (home page) gives a real-time overview of the entire business.")

h2("Pipeline Values")
p("Four cards at the top: Total Pipeline, Opportunities, Quoted, and On-Order values.")

h2("ICU / Critical Alerts")
p("A red banner appears if any projects are flagged as ICU or Critical priority. Click to navigate.")

h2("Quick Stats & Content")
b("Total Projects, Active Projects, Total Products, Total Quotes, Open NCRs")
b("Product Pipeline by Department — Counts per department")
b("Recent Projects — 10 most recently updated")
b("Recent Quotes — Latest 5 with status and values")
b("Needs Attention — Products past their required completion date")
b("Projects by Stage — Breakdown by current status")

// ══════════════════════════════════════════════════════
// 4. CRM PIPELINE & SALES
// ══════════════════════════════════════════════════════

section()
title("4. CRM Pipeline & Sales")

p("The CRM module manages the full sales cycle from first enquiry to won/lost deal.")

h2("Three Views")
kv("Pipeline:", "Kanban board with drag-and-drop. Best for daily pipeline management.")
kv("Board:", "Groups opportunities under each prospect. Best for account-based selling.")
kv("Table:", "Spreadsheet with filters. Best for searching and bulk review.")

h2("Pipeline Columns")
simpleTable(
  ["Column", "Colour", "Meaning"],
  [
    ["Active Lead", "Blue", "Actively pursuing"],
    ["Pending Approval", "Orange", "Quote awaiting approval"],
    ["Quoted", "Amber", "Quote sent to customer"],
    ["Won", "Green", "Deal closed"],
    ["Lost", "Red", "Did not win"],
    ["Dead Lead", "Grey", "Not pursuing"],
  ]
)

h2("Creating Prospects & Opportunities")
p("A Prospect is a company. An Opportunity (Lead) is a specific deal. Create the Prospect first, then create Leads under it with estimated value and close date.")

h2("Moving Cards")
p("Drag and drop between columns, or click a card and change the status dropdown. Dead leads require a reason (No budget, Competitor, Cancelled, etc.) and can be revived later.")

// ══════════════════════════════════════════════════════
// 5. QUOTE BUILDER
// ══════════════════════════════════════════════════════

section()
title("5. Quote Builder")

p("The Quote Builder creates detailed pricing. Access it by clicking the quote icon on a CRM opportunity card.")

h2("Adding Line Items")
h3("Configure Product (Catalogue Items)")
b("Select product family, type, and variant from the catalogue")
b("Set dimensions: Width, Height, Depth (mm), Leaf count, Opening direction")
b("Configure options: Transome, Vent, Lock type, Finish/Coating")
b("System auto-calculates BOM cost + shop floor labour (£17/hr)")

h3("Manual Item (Services & Bespoke)")
b("Enter Description, Type (Product/Activity), Quantity, Unit Cost")
b("Set Classification: Standard, CTO (Configure to Order), or ETO (Engineer to Order)")

warn("Engineer to Order lines require multi-level director approval before the quote can be sent.")

h2("Editing Existing Lines")
p("Click any row in the Products & Activities table to re-edit it. Product lines reopen the full configurator with previous selections pre-filled.")

h2("Pricing")
b("RD Cost — Research & Development surcharge (optional)")
b("Risk Cost — Contingency/risk premium (optional)")
b("Margin % — Markup percentage on total cost")
gap(0.2)
p("Quoted Price = (Line Items + RD + Risk) × (1 + Margin% / 100)")

h2("Quote Approval Workflow")
b("Draft → Submit for Approval → Approved (or Rejected) → Send to Customer")

h2("Lifting Plan")
p("For heavy/oversized products: estimated weight, max lift height, crane required, site access notes.")

// ══════════════════════════════════════════════════════
// 6. PROJECTS
// ══════════════════════════════════════════════════════

section()
title("6. Projects")

h2("Project List")
p("Filterable table with Status, Sales Stage, Work Stream, Priority, Classification filters. Auto-generated project numbers (e.g. 100001).")

tip("Projects are usually created automatically when converting a won CRM opportunity.")

h2("Project Detail Page")
h3("Lifecycle Stepper (P0–P5)")
simpleTable(
  ["Gate", "Name", "Meaning"],
  [
    ["P0", "Enquiry", "Customer enquiry logged"],
    ["P1", "Quotation", "Quote prepared and submitted"],
    ["P2", "Order Handover", "Order confirmed, project starts"],
    ["P3", "Design Review", "Design complete, production ready"],
    ["P4", "Production Complete", "All products manufactured"],
    ["P5", "Handover / Close", "Installed, reviewed, project closed"],
  ]
)

h3("Tabs")
b("Products — All products with department badges, stage, designer, due date")
b("Overview — Lifecycle stepper, project details, key dates")
b("NCRs — Non-conformance reports with severity, status, cost impact")
b("Financials — Retentions, plant hire, sub-contracts, cost categories")
b("Documents — Upload drawings, specifications, certificates, photos")

h2("Board (Motherboard)")
p("Kanban board at /board showing all active projects. Columns: Opportunity → Quotation → Design → Manufacture → Installation → Review. Drag and drop to update.")

// ══════════════════════════════════════════════════════
// 7. PRODUCT TRACKER
// ══════════════════════════════════════════════════════

section()
title("7. Product Tracker")

p("The Tracker (/tracker) is an Excel-style view of ALL products across ALL projects, replacing the old Excel tracker.")

h2("Department Flow")
p("Planning → Design → Production → Installation → Review → Complete")

h2("Production Sub-Stages")
p("Cutting → Fabrication → Fitting → Shotblasting → Painting → Packing → Dispatched")

h2("Columns & Filters")
b("Project, Job No., Part Code, Description, Qty, Department, Stage")
b("Designer, Coordinator, Design Status, Install Status, Due Date, RAG")
b("Filter by: Department, Stage, Designer, Coordinator, Search text")

// ══════════════════════════════════════════════════════
// 8. DESIGN MODULE
// ══════════════════════════════════════════════════════

section()
title("8. Design Module")

p("The Design module (/design) manages the engineering design workflow with a Kanban board and designer workload views.")

h2("Design Kanban Columns")
simpleTable(
  ["Column", "Colour", "Meaning"],
  [
    ["Waiting", "Grey", "Queued for design to begin"],
    ["In Progress", "Blue", "Actively being designed"],
    ["Review/Approval", "Amber", "Client or internal review"],
    ["Design Complete", "Green", "Ready for handover to production"],
  ]
)

h2("Job Types")
b("GA Drawing — General arrangement drawing")
b("Production Drawings — Detailed manufacturing drawings")
b("BOM Finalisation — Bill of materials completion")
b("Design Review — Internal review and sign-off")
gap(0.2)
p("Each job: QUEUED → IN_PROGRESS → SUBMITTED → APPROVED → SIGNED_OFF")

h2("Designer Workload")
b("Number of assigned cards, utilisation %, countdown timers, overdue alerts")

h2("Handover to Production")
b("1. Design team clicks 'Propose Handover' on design-complete project")
b("2. Fill in handover checklist (drawings complete, BOM verified, etc.)")
b("3. Production manager reviews and accepts or returns with notes")
b("4. Accepted → production workflow activates")

warn("Production cannot begin until the design manager formally hands over the project.")

// ══════════════════════════════════════════════════════
// 9. PRODUCTION & WORKSHOP
// ══════════════════════════════════════════════════════

section()
title("9. Production & Workshop")

p("The Production module (/production) manages shop floor manufacturing with a dashboard and workshop view.")

h2("Production Dashboard")
b("Design Complete column — Read-only incoming from design")
b("Pending Handover column — Review and accept/return handovers")
b("Active Projects — Products moving through workshop stages")
b("Single production flow with work stream categorisation (Utility, Bespoke, Community, Blast, Refurbishment)")

h2("Workshop Stages")
simpleTable(
  ["Stage", "Description"],
  [
    ["Cutting", "Raw material cutting and preparation"],
    ["Fabrication", "Welding and metal fabrication"],
    ["Fitting", "Assembly and component fitting"],
    ["Shotblasting", "Surface preparation and blasting"],
    ["Painting", "Coating and paint application"],
    ["Packing", "Final packing and dispatch prep"],
    ["Dispatched", "Shipped to customer site"],
  ]
)

h2("Workshop View")
b("Stage tabs for switching between phases")
b("Task status: Active, Blocked, Queued, Completed, Inspected")
b("Worker assignment, start/stop time tracking")
b("Inspection workflow: Complete → Inspection → Accepted")
b("NCR creation directly from production (reject dialog)")
b("Stats: total tasks, active/pending/completed, avg processing time")

// ══════════════════════════════════════════════════════
// 10. PLANNING & ATP
// ══════════════════════════════════════════════════════

section()
title("10. Planning & ATP")

p("The Planning module (/planning) provides capacity visibility and delivery date estimation.")

h2("Available-to-Promise (ATP) Calculator")
b("Enter products manually or select from CRM opportunities")
b("Each product: Description, Quantity, Estimated Hours/Unit")
b("Set requested delivery date")
b("System calculates earliest delivery based on current workload")

h2("ATP Results")
b("Earliest Delivery Date with confidence %")
b("Phase Breakdown: Design, Procurement, Production, Installation, Buffer")
b("Bottleneck Detection — which phase constrains delivery")
b("Feasibility Check — can we meet the requested date?")
b("Phase Timeline visualisation")

h2("System State Dashboard")
b("Active projects, design queue size, production task queues, installation backlog")

tip("Use ATP when quoting to give customers realistic delivery dates based on actual shop floor load.")

// ══════════════════════════════════════════════════════
// 11. FINANCE
// ══════════════════════════════════════════════════════

section()
title("11. Finance")

h2("Finance Dashboard")
b("KPIs: Total Contract Value, Committed, Overall Margin, Outstanding Debtors")
b("Over-budget alert, project financial summary, outstanding invoices")

h2("Job Costing / CVR")
p("Cost Value Reconciliation — for every on-order project shows Contract Value, PO Costs, Plant, Sub-Con, Total Committed, Variance, Margin %, Invoiced, Paid.")

h2("Invoicing")
p("Types: Application for Payment, Interim Invoice, Final Account, Retention Release, Variation.")
p("Status: Draft → Submitted → Certified → Paid (or Overdue/Disputed).")

h2("Nominal Codes")
p("Cost codes mirroring Sage Chart of Accounts. Categories: Materials, Labour, Plant Hire, Sub-Contract, Transport, Overheads, Prelims, Design, Other.")

h2("Sage Export")
p("CSV exports for: Customers, Suppliers, Nominal Codes, Invoices, POs, Job Costing.")

// ══════════════════════════════════════════════════════
// 12. CUSTOMERS & SUPPLIERS
// ══════════════════════════════════════════════════════

section()
title("12. Customers & Suppliers")

h2("Customers")
p("Types: Main Contractor, Utility, Council, Direct, Defence, Other. Each has contacts, quotes, projects, and notes.")

h2("Suppliers")
p("Each has contacts, purchase orders, plant hire, and sub-contract records.")

h2("Customer Portal")
p("Generate a read-only portal link for external customers to view project status without logging in.")

// ══════════════════════════════════════════════════════
// 13. CATALOGUE & BOM
// ══════════════════════════════════════════════════════

section()
title("13. Catalogue & BOM Library")

h2("Product Catalogue Hierarchy")
b("Family — e.g. Flood Doors, Flood Gates")
b("Type — e.g. Single Leaf, Double Leaf, Roller")
b("Variant — e.g. SR2, SR4, SR6 (flood resistance levels)")

h2("BOM Cost Calculation")
b("Base BOM items (materials, components, consumables)")
b("Spec modifiers (cost adjustments from selected options)")
b("Size scaling (costs that scale with dimensions)")
b("Labour cost (shop floor hours from Bill of Operations × £17/hr)")

// ══════════════════════════════════════════════════════
// 14. TEAM & ROLES
// ══════════════════════════════════════════════════════

section()
title("14. Team & User Roles")

simpleTable(
  ["Role", "Access", "Typical Use"],
  [
    ["Admin", "Full access", "IT / management"],
    ["Estimator", "Quotes + view", "Creates and manages quotes"],
    ["Project Coordinator", "Projects + POs", "Manages delivery"],
    ["Designer", "Design status", "Updates design work"],
    ["Production Manager", "Production", "Oversees manufacturing"],
    ["Viewer", "Read-only", "View everything"],
  ]
)

// ══════════════════════════════════════════════════════
// 15. DATA IMPORT
// ══════════════════════════════════════════════════════

section()
title("15. Data Import")

p("Bulk import at /import from Excel paste or CSV upload.")
b("Types: Customers, Suppliers, Nominal Codes, Projects, Products")
b("Auto-maps common column names, fuzzy-matches customers and users")
b("Import order: Customers/Suppliers → Nominal Codes → Projects → Products")

// ══════════════════════════════════════════════════════
// 16. REPORTS & CAPACITY
// ══════════════════════════════════════════════════════

section()
title("16. Reports & Capacity")

h2("Reports")
b("Pipeline by Sales Stage and Work Stream")
b("Quote Funnel (Draft → Submitted → Accepted/Declined)")
b("NCR Summary (count, cost impact, severity)")
b("Project Profitability (margin analysis)")

h2("Capacity Planning")
b("Heatmap: Green (<80%), Amber (80-100%), Red (>100%) utilisation")
b("Departments: Design, Ops, Production, Installation")
b("Data source: product-level hours and planned dates")

// ══════════════════════════════════════════════════════
// 17. COMMON WORKFLOWS
// ══════════════════════════════════════════════════════

section()
title("17. Common Workflows")

h2("New Enquiry → Quote")
b("1. CRM → New Prospect (if new company)")
b("2. CRM → New Lead (opportunity)")
b("3. Quote Builder → Add line items, set costs & margin")
b("4. Submit for Approval → Sales Director reviews → Approved → Send to customer")

h2("Won Deal → Project")
b("1. Move card to WON in CRM pipeline")
b("2. Click 'Convert to Project' — auto-creates project, products, formal quote")
b("3. Click 'Hand over to designers' — activates design workflow")

h2("Design → Production")
b("1. Design completes all job cards (GA, production drawings, BOM)")
b("2. Design manager proposes handover")
b("3. Production manager accepts → products enter workshop")

h2("Manufacturing")
b("1. Workshop → Select stage → Assign workers → Start/Complete tasks")
b("2. Inspection → Accept or raise NCR → Next stage")

h2("Finance Review")
b("1. Job Costing — Review CVR for all projects")
b("2. Invoicing — Submit applications, track payments")
b("3. Sage Export — Download CSVs")

h2("Project Close")
b("1. All products Complete, NCRs closed, final invoices submitted")
b("2. Lifecycle → P5, status → Complete")

// ══════════════════════════════════════════════════════
// 18. QUICK REFERENCE
// ══════════════════════════════════════════════════════

section()
title("18. Quick Reference")

h2("Status Colours")
simpleTable(
  ["Colour", "Meaning"],
  [
    ["Grey", "Draft / Inactive / Planning / Dead Lead"],
    ["Blue", "Submitted / In Progress / Design / Active Lead"],
    ["Amber", "Partial / Warning / Quoted / Pending Approval"],
    ["Green", "Accepted / Complete / Won / On budget"],
    ["Red", "Declined / Overdue / Lost / Over budget"],
  ]
)

h2("Auto-Generated Numbers")
simpleTable(
  ["Entity", "Format", "Example"],
  [
    ["Project", "6-digit", "100001, 200598"],
    ["Quote", "Q-XXXX", "Q-0001"],
    ["NCR", "NCR-XXXX", "NCR-0001"],
    ["Purchase Order", "PO-XXXX", "PO-0001"],
    ["Invoice", "INV-XXXX", "INV-0001"],
  ]
)

h2("Key Flows")
gap(0.2)
kv("Departments:", "Planning → Design → Production → Installation → Review → Complete")
kv("Workshop:", "Cutting → Fabrication → Fitting → Shotblasting → Painting → Packing → Dispatched")
kv("CRM:", "Active Lead → Pending Approval → Quoted → Won / Lost")
kv("Design:", "Waiting → In Progress → Review → Design Complete → Handover")
kv("Lifecycle:", "P0 Enquiry → P1 Quote → P2 Order → P3 Design → P4 Production → P5 Close")

h2("Login Credentials (Test)")
simpleTable(
  ["Email", "Password", "Role"],
  [
    ["test@mme.co.uk", "Test1234", "Admin"],
    ["james.morton@mme.co.uk", "password123", "Admin"],
  ]
)

gap(2)
doc.fontSize(9).fillColor(C.muted).text("ETHOS MK.I — Software Handbook v1.0 — February 2026", { align: "center" })
doc.text("MM Engineered Solutions Ltd — Confidential", { align: "center" })

// ─── Done ────────────────────────────────────────────
doc.end()

stream.on("finish", () => {
  const stats = fs.statSync(OUTPUT)
  console.log(`\n✓ Handbook generated: ${OUTPUT}`)
  console.log(`  Size: ${(stats.size / 1024).toFixed(0)} KB`)
})
