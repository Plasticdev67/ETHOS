/**
 * Generate System Overview SOP PDF
 * Uses the actual MME coral logo + PX Grotesk brand font
 * Usage: npx tsx scripts/generate-sop-system-overview.ts
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
      Title: "ETHOS — System Overview SOP",
      Author: "MM Engineered Solutions",
      Subject: "ETHOS System Overview v1.0",
    },
  })

  const out = path.join(__dirname, "..", "ETHOS-System-Overview-SOP.pdf")
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
    .text("System Overview", 0, doc.y, { width: PW, align: "center" })
  doc.moveDown(0.2)
  doc.font(FONT_LIGHT).fontSize(18).fillColor(CORAL)
    .text("ETHOS System Guide", 0, doc.y, { width: PW, align: "center" })

  doc.y = 540
  doc.font(FONT_LIGHT).fontSize(10).fillColor("#ffffff80")
    .text("ETHOS ERP  |  System Overview", 0, doc.y, { width: PW, align: "center" })
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
    "1.  What is ETHOS",
    "2.  Logging In",
    "3.  Dashboard",
    "4.  Navigation",
    "5.  User Roles & Permissions",
    "6.  Branding & Visual Design",
    "7.  Settings & Configuration",
    "8.  System Architecture",
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
  sectionHeading("1", "What is ETHOS")
  p("ETHOS (Engineer-To-Order Hub Operating System) is a purpose-built ERP platform for MM Engineered Solutions Ltd. It replaces a patchwork of Sage 200, OneDrive, Microsoft Teams, email, spreadsheets, and Safety Culture with a single, unified source of truth for the entire business.")
  p("The system is designed for an engineer-to-order (ETO) manufacturer of flood defence and blast protection products. It manages the full project lifecycle — from initial lead capture and quoting through design, production, installation, and financial close-out.")

  sub("Why ETHOS Exists")
  b("No single source of truth — data was trapped across multiple disconnected systems")
  b("Manual handoffs between departments caused delays and errors")
  b("No real-time visibility into project status, costs, or capacity")
  b("Reporting required pulling data from 5+ different places")

  sub("Who Uses ETHOS")
  p("Every department at MME uses ETHOS daily. The system serves approximately 22 people across the following teams:")
  b("Sales & Estimating — CRM, quoting, opportunity management")
  b("Design Engineering — design cards, job cards, BOM management, handovers")
  b("Production — production tracking, stage progression, quality inspections")
  b("Installation — site management, install scheduling")
  b("Projects — project coordination, variations, NCRs")
  b("Finance — invoicing, purchase orders, credit control, VAT")

  sub("Key Capabilities")
  b("CRM with pipeline tracking and win/loss analytics")
  b("Automated quote generation with margin calculation")
  b("Design module with sequential job cards and peer review workflow")
  b("Production board with stage-by-stage tracking")
  b("Installation management with site scheduling")
  b("Full finance module — sales ledger, purchase ledger, bank, VAT (MTD-ready)")
  b("Role-based access control with 22 distinct roles")
  b("Audit trail logging every change across the system")
  b("Real-time dashboards with department-specific KPIs")

  // ── 2 ──
  sectionHeading("2", "Logging In")

  sub("Accessing ETHOS")
  p("ETHOS is a web application accessible from any modern browser. No software installation is required.")
  bb("Production URL:", "https://ethos-three-theta.vercel.app")
  bb("Local development:", "http://localhost:3000")
  p("Navigate to the URL in your browser. If you are not already signed in, you will be redirected to the login page automatically.")

  sub("Login Page")
  p("The login page is styled in MME brand colours — dark navy background (#23293a) with the MME coral logo and ETHOS branding. The subtitle reads \"Engineer-To-Order Hub\" beneath the ETHOS title.")
  p("There are two ways to sign in:")

  subsub("Microsoft SSO (Recommended)")
  p("Click the \"Sign in with Microsoft\" button. This uses Microsoft Entra ID (formerly Azure AD) and will authenticate against your company Microsoft 365 account. This is the preferred method for all MME staff.")

  subsub("Email & Password")
  p("Enter your MME email address and password, then click \"Sign In\". A show/hide toggle is available on the password field. If credentials are incorrect, an error message appears in a red banner.")

  sub("Authentication Behaviour")
  b("All pages except the login page require authentication")
  b("All API routes are protected — unauthenticated requests return 401")
  b("The /portal route is publicly accessible (customer-facing portal with separate token auth)")
  b("If you are already logged in and visit /login, you are redirected to the dashboard")
  b("Signing out redirects you back to the login page")
  callout("First-time users may have a mustChangePassword flag set, which prompts a password change on first login.")

  // ── 3 ──
  sectionHeading("3", "Dashboard")
  p("The dashboard is the landing page of ETHOS (the root \"/\" route). It provides a real-time overview of the entire business, with data refreshed on every page load.")

  sub("Overview Tab")
  p("The default view shows high-level KPIs and department summaries visible to managers and directors:")
  b("Active Projects — count of all non-complete projects")
  b("Total Products — count of all products across projects")
  b("Pipeline Value — sum of opportunity, quoted, and order values")
  b("Open NCRs — count of non-conformance reports in Open or Investigating status")
  b("ICU Carousel — flagged projects requiring immediate attention")

  sub("Department Summary Cards")
  p("Five department cards provide at-a-glance status:")
  bb("Sales —", "pipeline value, weighted forecast, conversion rate, wins this month")
  bb("Design —", "active design cards, overdue cards, top overdue items")
  bb("Production —", "products in production, stage breakdown, bottleneck stage")
  bb("Installation —", "active installs, upcoming completions")
  bb("Finance —", "total contract value, cost committed, gross margin, outstanding invoices")

  sub("Department Tabs")
  p("Below the overview, tabbed views provide deeper analysis for each department:")
  bb("Sales Tab —", "full pipeline by stage, top opportunities, monthly win/loss trend, quotes awaiting response, win rate by workstream")
  bb("Design Tab —", "cards by status, designer workload, average cycle time, overdue list, handovers pending")
  bb("Production Tab —", "products by stage, stage throughput times, overdue production, open NCRs, by-workstream breakdown")
  bb("Installation Tab —", "active installs, upcoming completions, monthly scheduling")

  sub("Additional Dashboard Components")
  bb("Upcoming Deadlines —", "next 5 projects by target completion date")
  bb("Workstream Performance —", "project count, average margin, and on-time percentage per workstream (Utilities, Community, Bespoke, Blast, Refurbishment)")
  bb("Recent Projects —", "last 5 updated projects with status, RAG, customer, and value")
  callout("Dashboard visibility is role-dependent. Only managers and directors see the full department dashboards. Standard users see the overview KPIs.")

  // ── 4 ──
  sectionHeading("4", "Navigation")
  p("ETHOS uses a fixed sidebar for navigation on the left-hand side of the screen. The sidebar is collapsible on desktop and slides out as an overlay on mobile devices.")

  sub("Sidebar Structure")
  p("The sidebar displays the MME logo and ETHOS branding at the top, followed by navigation links. Each link has an icon and label. The active page is highlighted with a coral accent bar on the left.")
  p("The full navigation menu contains the following modules:")

  const n1 = 130, n2 = CW - 130
  th(["Module", "Route & Purpose"], [n1, n2])
  td(["Dashboard", "/ — Main overview with KPIs and department summaries"], [n1, n2])
  td(["CRM", "/crm — Lead and opportunity management, pipeline tracking"], [n1, n2])
  td(["Design", "/design — Design board, job cards, BOM, handovers"], [n1, n2])
  td(["Production", "/production — Production tracking, stage progression"], [n1, n2])
  td(["Installation", "/installation — Install scheduling and site management"], [n1, n2])
  td(["Quotes", "/quotes — Quote creation, revision, and approval"], [n1, n2])
  td(["Purchasing", "/purchasing — Purchase orders and supplier management"], [n1, n2])
  td(["Finance", "/finance — Invoicing, credit control, bank, VAT"], [n1, n2])
  td(["Customers", "/customers — Customer records and contacts"], [n1, n2])
  td(["Suppliers", "/suppliers — Supplier records and information"], [n1, n2])
  td(["Catalogue", "/catalogue — Product catalogue and item library"], [n1, n2])
  td(["BOM Library", "/bom-library — Reusable bill of materials templates"], [n1, n2])
  td(["Team", "/team — User management, roles, assignments"], [n1, n2])
  td(["Capacity", "/capacity — Resource capacity planning"], [n1, n2])
  td(["Planning", "/planning — Project scheduling and timeline view"], [n1, n2])
  td(["Reports", "/reports — Business reports and analytics"], [n1, n2])
  td(["Import", "/import — Data import tools"], [n1, n2])
  td(["Audit Trail", "/settings/audit — Change history and time summary"], [n1, n2])
  td(["Suggestions", "/suggestions — Team feedback and feature requests"], [n1, n2])
  doc.moveDown(0.4)

  sub("Notification Badges")
  p("The sidebar shows live badge counts on certain modules to alert users to pending actions:")
  bb("Design —", "count of pending handovers awaiting acknowledgement")
  bb("Production —", "count of incoming items requiring attention")
  p("Badge counts refresh automatically every 60 seconds.")

  sub("Header Bar")
  p("The header runs across the top of every page. In the default light theme it uses the dark navy (#23293a) background. It contains:")
  b("Project search — type to search, results filter in real time, Enter navigates to projects")
  b("Font size control — small (S), medium (M), large (L) toggle for accessibility")
  b("Notification bell — placeholder for future notifications")
  b("User avatar — initials in a coral circle, with name and role displayed")
  b("Sign out button — logs out and returns to the login page")

  // ── 5 ──
  sectionHeading("5", "User Roles & Permissions")
  p("ETHOS implements role-based access control (RBAC). Every user is assigned exactly one role, which determines what they can see and do across the system. Roles are assigned on the Team page by an administrator.")

  sub("Available Roles")
  p("The system defines 22 roles. These map directly to job titles and responsibilities within MME:")

  const r1 = 170, r2 = CW - 170
  th(["Role", "Department / Scope"], [r1, r2])
  td(["Managing Director", "Full access — all modules, sign-off authority"], [r1, r2])
  td(["Technical Director", "Full access — all modules, design sign-off"], [r1, r2])
  td(["Sales Director", "Sales, CRM, quotes, customer management"], [r1, r2])
  td(["Director", "Broad access — projects, quotes, CRM, variations, NCRs"], [r1, r2])
  td(["Engineering Manager", "Design management, sign-off, assign designers, purchasing"], [r1, r2])
  td(["Production Manager", "Production management, inspections, handover acknowledgement"], [r1, r2])
  td(["Project Manager", "Projects, quotes, CRM, design management, handovers"], [r1, r2])
  td(["R&D Manager", "Products, design start/review, purchasing, catalogue"], [r1, r2])
  td(["Design Engineer", "Products, design start/review, purchasing"], [r1, r2])
  td(["Site Manager", "Projects, products, NCRs"], [r1, r2])
  td(["Site Supervisor", "Read access + NCR creation"], [r1, r2])
  td(["Business Development", "Projects, quotes, CRM, customer management"], [r1, r2])
  td(["Head of Finance/IT", "Purchasing approval, finance, audit, suppliers"], [r1, r2])
  td(["Finance Manager", "Purchasing approval, finance, audit"], [r1, r2])
  td(["Project Coordinator", "Projects, design management, purchasing, variations"], [r1, r2])
  td(["Project Administrator", "Projects, products, purchasing, customers, NCRs"], [r1, r2])
  td(["Production Supervisor", "Products, production management, inspections, NCRs"], [r1, r2])
  td(["Production Planner", "Products, production management, purchasing"], [r1, r2])
  td(["Accounts", "Purchasing, finance"], [r1, r2])
  td(["Surveyor", "CRM access"], [r1, r2])
  td(["Staff", "Read-only access to all modules"], [r1, r2])
  td(["Admin", "Full system access — all permissions, settings, team management"], [r1, r2])
  doc.moveDown(0.4)

  sub("Permission Categories")
  p("Permissions are grouped by module. Every user gets base read access to all core modules (projects, quotes, products, purchasing, finance, customers, suppliers, catalogue, reports, team, NCRs, variations, CRM, design, production). Write permissions are additive based on role.")
  p("Key permission groups include:")
  bb("projects:", "read, create, edit, delete")
  bb("quotes:", "read, create, edit, delete, approve")
  bb("design:", "read, manage, assign, start, review, signoff, handover-create, handover-acknowledge")
  bb("production:", "read, manage, inspect")
  bb("finance:", "read, edit")
  bb("purchasing:", "read, create, edit, approve-high")
  bb("crm:", "read, create, edit, delete, convert")
  bb("settings:", "admin (restricted to Admin role)")

  sub("User Departments")
  p("Each user may optionally be assigned to a department for organisational grouping:")
  b("Directors")
  b("Engineering")
  b("Production")
  b("Sales")
  b("Projects")
  b("R&D")
  b("Site")
  b("Finance/IT/Procurement")
  callout("Only Admin users can access system settings and manage team members. The Staff role is read-only — it cannot edit any data.")

  // ── 6 ──
  sectionHeading("6", "Branding & Visual Design")
  p("ETHOS follows the MM Engineered Solutions brand guidelines throughout. The visual design is consistent across all modules.")

  sub("Brand Colours")
  b("Dark navy (#23293a) — header, sidebar, and primary backgrounds")
  b("MME coral (#e95445) — accents, active states, primary actions, and call-to-action buttons")
  b("Cyan (#00b1eb) — secondary highlights and informational elements")
  b("White content area with clean, accessible typography")

  sub("Typography")
  b("PX Grotesk — primary brand font (light, regular, bold weights)")
  b("Inter — fallback font for system compatibility")
  b("Consistent font sizing across all modules for readability")

  sub("Layout")
  b("MME coral logo displayed in the sidebar header")
  b("Fixed sidebar navigation with collapsible option on desktop")
  b("Responsive design — full mobile support with slide-out navigation")
  b("Branded login page with MME logo and \"Engineer-To-Order Hub\" subtitle")

  // ── 7 ──
  sectionHeading("7", "Settings & Configuration")
  p("ETHOS provides several areas for system configuration, accessible depending on user role.")

  sub("Team Management (/team)")
  p("Accessible to Admin users. The Team page lists all users with their name, email, role, and assignment counts. From here, administrators can:")
  b("Add new users with name, email, password, and role")
  b("Edit existing user roles")
  b("View how many projects, products, and design cards each user is assigned to")

  sub("Audit Trail (/settings/audit)")
  p("A full change log of every action performed in the system. Visible to roles with audit:read permission (Admin, Directors, Head of Finance, Finance Manager).")
  b("Filterable by entity type (Project, Quote, Product, Variation, PurchaseOrder, NCR, Invoice)")
  b("Shows action type (Create, Update, Delete) with timestamp and user")
  b("Displays field-level changes with old and new values")
  b("Project Time Summary table — shows design days, production days, install days, and total elapsed days per project")

  sub("Finance Settings (/finance/settings)")
  p("Configurable finance parameters organised across five tabs:")
  bb("Company Info —", "legal name, trading name, registration numbers, VAT number, address, contact details, financial year start, currency")
  bb("Account Mappings —", "default GL account codes for system postings (debtors, creditors, VAT, bank, revenue, COS)")
  bb("VAT Configuration —", "VAT scheme (accrual/cash/flat rate), return frequency, HMRC MTD connection status, sandbox mode")
  bb("Numbering Sequences —", "auto-incrementing reference numbers for journals, invoices, purchase invoices, credit notes, receipts, payments")
  bb("System Info —", "system version, database, framework, HMRC MTD status, and module implementation phases")
  callout("Finance settings are currently stored in localStorage. They will be persisted to the database when the settings API is built.")

  sub("Font Size")
  p("The header provides a font size toggle (small, medium, large) that adjusts the global text size across the application. This setting persists in localStorage under the key \"ethos-font-size\".")

  // ── 8 ──
  sectionHeading("8", "System Architecture")
  p("This section provides a non-technical overview of how ETHOS is built and deployed.")

  sub("Technology Stack")
  bb("Frontend:", "Next.js 15 (App Router) with React and TypeScript")
  bb("Styling:", "Tailwind CSS with PX Grotesk brand font")
  bb("Database:", "PostgreSQL hosted on Supabase (cloud)")
  bb("ORM:", "Prisma — manages database schema and queries")
  bb("Authentication:", "NextAuth v5 with Microsoft Entra ID SSO and credential login")
  bb("Hosting:", "Vercel (serverless deployment, CDN, automatic SSL)")

  sub("How It Works")
  p("ETHOS is a web application. Users access it through a browser — there is nothing to install. The application runs on Vercel's cloud infrastructure, which provides automatic scaling, global CDN, and SSL certificates.")
  b("Pages are server-rendered on each request for real-time data")
  b("The database is a managed PostgreSQL instance on Supabase in EU (Paris region)")
  b("Connection pooling via Supabase Session Pooler ensures reliable connections")
  b("All API routes are protected by middleware that checks for a valid session token")
  b("Static assets (images, fonts, icons) are served from the CDN")

  sub("Deployment")
  p("The application is deployed via the Vercel CLI. Environment variables (database URL, auth secrets, Microsoft SSO credentials) are configured in the Vercel dashboard. Deployments are triggered manually with the \"vercel --prod\" command.")
  b("Source code is stored in a GitHub repository (Plasticdev67/ETHOS)")
  b("Each deployment creates an immutable snapshot with a unique URL")
  b("Rollbacks are instant — revert to any previous deployment if needed")

  sub("Data & Security")
  b("All data is stored in a single PostgreSQL database — no spreadsheets, no local files")
  b("All connections use TLS encryption (HTTPS for web, SSL for database)")
  b("Authentication is handled by NextAuth with JWT session tokens")
  b("Middleware enforces authentication on every page and API route")
  b("Role-based permissions are checked server-side for all write operations")
  b("An audit trail records every create, update, and delete action with user, timestamp, and field-level diff")
  callout("ETHOS is cloud-hosted. There is no on-premise server to maintain. The database is backed up automatically by Supabase.")

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
      .text("ETHOS System Overview v1.0", PW - R - 140, 34, { width: 140, align: "right", height: 12 })

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
