/**
 * Generate Code Audit Report PDF
 * Uses the actual MME coral logo + PX Grotesk brand font
 * Usage: npx tsx scripts/generate-audit-report.ts
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
const RED_BG = "#fef3f2"
const GREEN  = "#16a34a"
const AMBER  = "#d97706"
const RED    = "#dc2626"

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
      Title: "ETHOS — Comprehensive Code Audit Report",
      Author: "MM Engineered Solutions",
      Subject: "ETHOS Code Audit v1.0",
    },
  })

  const out = path.join(__dirname, "..", "ETHOS-Code-Audit-Report.pdf")
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

  function callout(text: string, color = CORAL, bgColor = RED_BG) {
    ensureSpace(36)
    const y = doc.y
    // Measure text height
    const textH = doc.font(FONT_REG).fontSize(8.5).heightOfString(text, { width: CW - 28 })
    const boxH = Math.max(26, textH + 14)
    doc.save()
    doc.roundedRect(L, y, CW, boxH, 3).fill(bgColor)
    doc.rect(L, y, 3, boxH).fill(color)
    doc.restore()
    doc.font(FONT_REG).fontSize(8.5).fillColor(MID)
      .text(text, L + 14, y + 7, { width: CW - 28 })
    doc.y = y + boxH + 6
  }

  function criticalCallout(text: string) {
    callout(text, RED, "#fef2f2")
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
        .text(c, x + 6, y + 7, { width: widths[i] - 12, height: 12, ellipsis: true })
      x += widths[i]
    })
    doc.y = y + 23
  }

  function td(cells: string[], widths: number[], rowColor?: string) {
    ensureSpace(20)
    const y = doc.y
    const bg = rowColor || (tIdx % 2 === 0 ? WHITE : PALE)
    tIdx++
    doc.save()
    doc.rect(L, y, CW, 20).fill(bg)
    doc.rect(L, y + 20, CW, 0.5).fill(BORDER)
    doc.restore()
    let x = L
    cells.forEach((c, i) => {
      doc.font(FONT_REG).fontSize(8).fillColor(DARK)
        .text(c, x + 6, y + 5, { width: widths[i] - 12, height: 13, ellipsis: true })
      x += widths[i]
    })
    doc.y = y + 21
  }

  // Score bar helper
  function scoreBar(label: string, score: number, maxScore = 10) {
    ensureSpace(24)
    const y = doc.y
    const barW = 160
    const barH = 12
    const fillW = (score / maxScore) * barW
    const color = score >= 7 ? GREEN : score >= 5 ? AMBER : RED

    doc.font(FONT_REG).fontSize(9).fillColor(DARK)
      .text(label, L, y + 1, { width: 140 })
    // Background bar
    doc.save().roundedRect(L + 150, y, barW, barH, 3).fill(BORDER).restore()
    // Fill bar
    if (fillW > 0) {
      doc.save().roundedRect(L + 150, y, fillW, barH, 3).fill(color).restore()
    }
    // Score text
    doc.font(FONT_BOLD).fontSize(9).fillColor(DARK)
      .text(`${score} / ${maxScore}`, L + 150 + barW + 10, y + 1, { width: 50 })
    doc.y = y + barH + 6
  }

  // ════════════════════════════════════════════════════════════════
  //  PAGE 1 — TITLE
  // ════════════════════════════════════════════════════════════════
  doc.save().rect(0, 0, PW, PH).fill(NAVY).restore()
  doc.image(logoWhitePng, (PW - 220) / 2, 200, { width: 220 })

  doc.y = 270
  doc.save().rect((PW - 60) / 2, doc.y, 60, 2).fill(CORAL).restore()
  doc.y += 40

  doc.font(FONT_BOLD).fontSize(32).fillColor(WHITE)
    .text("Code Audit Report", 0, doc.y, { width: PW, align: "center" })
  doc.moveDown(0.2)
  doc.font(FONT_LIGHT).fontSize(16).fillColor(CORAL)
    .text("ETHOS MK.1 — Comprehensive Assessment", 0, doc.y, { width: PW, align: "center" })

  doc.y = 420
  doc.font(FONT_BOLD).fontSize(48).fillColor(CORAL)
    .text("5.5 / 10", 0, doc.y, { width: PW, align: "center" })
  doc.moveDown(0.1)
  doc.font(FONT_LIGHT).fontSize(12).fillColor("#ffffff80")
    .text("Production-Readiness Score", 0, doc.y, { width: PW, align: "center" })

  doc.y = 560
  doc.font(FONT_LIGHT).fontSize(10).fillColor("#ffffff80")
    .text("Document: ETHOS-AUDIT-001  |  Version 1.0", 0, doc.y, { width: PW, align: "center" })
    .text("1 March 2026", { width: PW, align: "center" })

  doc.y = 620
  doc.font(FONT_REG).fontSize(9).fillColor("#ffffff50")
    .text("Prepared for MM Engineered Solutions Ltd", 0, doc.y, { width: PW, align: "center" })
    .text("Port Talbot, Wales", { width: PW, align: "center" })

  doc.y = 740
  doc.font(FONT_LIGHT).fontSize(8).fillColor("#ffffff30")
    .text("CONFIDENTIAL — Internal Use Only", 0, doc.y, { width: PW, align: "center" })

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
    "1.  Executive Summary",
    "2.  Score Card",
    "3.  Critical Risks",
    "4.  Security Assessment",
    "5.  Data Integrity",
    "6.  Performance",
    "7.  Code Quality",
    "8.  Compliance & Audit Trails",
    "9.  Prioritised Remediation Plan",
    "10. Conclusion & Recommended Sequence",
  ]
  toc.forEach((t, i) => {
    const y = doc.y
    doc.save().circle(L + 6, y + 5, 2).fill(i === 0 ? CORAL : BORDER).restore()
    doc.font(FONT_REG).fontSize(10).fillColor(DARK)
      .text(t, L + 18, y, { width: CW - 18 })
    doc.moveDown(0.35)
  })

  // ════════════════════════════════════════════════════════════════
  //  SECTION 1 — EXECUTIVE SUMMARY
  // ════════════════════════════════════════════════════════════════
  doc.addPage()

  sectionHeading("1", "Executive Summary")

  p("ETHOS (Engineer-To-Order Hub Operating System) is a custom-built ERP system for MM Engineered Solutions Ltd, managing the full project lifecycle from sales enquiry through design, production, installation, and financial close-out. This report presents the findings of a comprehensive code audit covering security, data integrity, performance, code quality, and compliance.")

  p("The audit reviewed all 198 API route files, the full Prisma schema (90+ models, 44 enums), all utility libraries, middleware, and representative page components.")

  sub("Verdict")
  criticalCallout("ETHOS is not ready for production use as the primary operational system in its current state. The security gaps in the finance module and the data integrity risks around number generation are blocking issues. However, the architectural foundation is sound — the fixes are mechanical (wiring in existing utilities), not architectural rewrites.")

  sub("Project Overview")
  const ow = [160, CW - 160]
  th(["Item", "Value"], ow)
  td(["Framework", "Next.js 15.5.12 / React 19 / TypeScript 5 (strict)"], ow)
  td(["Database", "PostgreSQL on Supabase, via Prisma 7.3"], ow)
  td(["Authentication", "NextAuth v5 beta 30 (Microsoft SSO + credentials)"], ow)
  td(["Total API Routes", "198 route files across 33 API groups"], ow)
  td(["Prisma Models", "90+ models, 44 enums"], ow)
  td(["Test Coverage", "Effectively zero (2 smoke-level E2E specs only)"], ow)
  td(["npm Vulnerabilities", "13 (3 high, 9 moderate, 1 low)"], ow)
  td(["Hosting", "Vercel (serverless) + Supabase (EU — Paris)"], ow)

  // ════════════════════════════════════════════════════════════════
  //  SECTION 2 — SCORE CARD
  // ════════════════════════════════════════════════════════════════
  sectionHeading("2", "Score Card")

  p("Each category is scored 1–10 based on the severity and breadth of findings.")
  doc.moveDown(0.3)

  scoreBar("Architecture", 7)
  scoreBar("Code Quality", 6)
  scoreBar("Data Integrity", 4)
  scoreBar("Security", 3)
  scoreBar("Performance", 5)
  scoreBar("Compliance", 4)
  doc.moveDown(0.3)
  scoreBar("OVERALL", 5.5)

  doc.moveDown(0.5)
  sub("Three Strongest Aspects")
  bb("Architecture —", "Clean Next.js 15 App Router with 33 API route groups. Repository pattern for Prisma type safety. Shared utilities exist and are well-designed.")
  bb("Design & Production —", "Best auth coverage, audit logging, and structured workflows. Design handovers, job cards, and production tasks are well-built.")
  bb("UI/UX Foundation —", "17 loading skeletons, consistent shadcn/ui, role-based UI gating, working customer portal, branded PDF generation.")

  // ════════════════════════════════════════════════════════════════
  //  SECTION 3 — CRITICAL RISKS
  // ════════════════════════════════════════════════════════════════
  sectionHeading("3", "Critical Risks")

  p("These are the three findings most likely to cause data loss, financial errors, or security breaches in production.")

  sub("Risk 1: 92% of API Routes Have No Server-Side Authentication")
  p("Only 16 of 197 API routes call requireAuth(). The entire finance module — 60+ routes handling bank transactions, journal entries, invoices, VAT returns, budgets, and year-end processing — has zero authentication or permission checks. Any authenticated user, regardless of role, can perform any financial operation.")
  criticalCallout("Impact: A staff member with read-only permissions could create journal entries, post bank payments, process VAT returns, or delete invoices. There is no server-side role enforcement on financial operations.")

  sub("Risk 2: Dual Number Generation Systems")
  p("Project numbers, quote numbers, and journal numbers are each generated via two different mechanisms. The safe getNextSequenceNumber() function (which uses atomic database counters) exists and is used on the main create routes. However, the opportunity-to-project conversion route uses a different method — findFirst(orderBy: desc) + 1 — which has a classic race condition.")
  criticalCallout("Impact: Two concurrent opportunity conversions could produce duplicate project numbers. The same applies to quote numbers and journal numbers. The @@unique constraint will cause one to fail with a 500 error.")

  sub("Risk 3: Admin User Creation Without Authentication")
  p("The file api/setup-sales/route.ts is a GET endpoint that creates or upserts a user with SALES_DIRECTOR role and hardcoded password 'password123'. No authentication is required. This endpoint is accessible to anyone who knows the URL.")
  criticalCallout("Impact: Anyone can create an admin-level account by visiting /api/setup-sales in a browser.")

  // ════════════════════════════════════════════════════════════════
  //  SECTION 4 — SECURITY
  // ════════════════════════════════════════════════════════════════
  sectionHeading("4", "Security Assessment")

  p("Score: 3/10. The application has a well-designed auth infrastructure (requireAuth, requirePermission, validateBody utilities exist) but they are only wired into a small fraction of routes.")

  sub("Authentication Coverage")
  const sw = [200, (CW - 200) / 2, (CW - 200) / 2]
  th(["Metric", "Count", "Percentage"], sw)
  td(["Routes with requireAuth()", "16 / 197", "8.1%"], sw)
  td(["Routes with requirePermission()", "24 / 197", "12.2%"], sw)
  td(["Routes with validateBody() (Zod)", "2 / 197", "1.0%"], sw)
  td(["Routes using raw request.json()", "131 / 133", "98.5%"], sw)

  doc.moveDown(0.3)
  sub("Protected Routes (Complete List)")
  p("The following 16 routes have both requireAuth() and requirePermission():")
  const pw = [240, CW - 240]
  th(["Route", "Permission"], pw)
  td(["projects/route.ts POST", "projects:create"], pw)
  td(["projects/[id]/route.ts PATCH/DELETE", "projects:edit"], pw)
  td(["customers/route.ts POST", "customers:create"], pw)
  td(["suppliers/route.ts POST", "suppliers:create"], pw)
  td(["quotes/route.ts POST", "quotes:create"], pw)
  td(["quotes/[id]/route.ts PATCH/DELETE", "quotes:edit"], pw)
  td(["purchase-orders/route.ts POST", "purchasing:create"], pw)
  td(["purchase-orders/[id]/route.ts PATCH/DELETE", "purchasing:edit"], pw)
  td(["purchase-orders/[id]/approve POST", "purchasing:approve-high"], pw)
  td(["ncrs/route.ts POST", "ncrs:create"], pw)
  td(["variations/route.ts POST", "variations:create"], pw)
  td(["opportunities/route.ts POST", "crm:create"], pw)
  td(["users/route.ts POST", "settings:admin"], pw)
  td(["users/[id]/route.ts PATCH/DELETE", "settings:admin"], pw)
  td(["catalogue/spec-fields POST/PATCH/DELETE", "catalogue:edit"], pw)
  td(["catalogue/bom POST/PATCH/DELETE", "catalogue:edit"], pw)

  doc.moveDown(0.3)
  callout("Everything else — including the entire finance module (60+ routes), all design job card actions, production moves, NCR edits/deletes, quote lines, opportunity edits, portal tokens, and data imports — has no server-side permission enforcement.")

  sub("Dependency Vulnerabilities")
  const vw = [120, 80, CW - 200]
  th(["Package", "Severity", "Issue"], vw)
  td(["nodemailer <=7.0.10", "HIGH", "Email domain conflict + DoS via recursive parser"], vw)
  td(["xlsx *", "HIGH", "Prototype pollution + ReDoS (no fix available)"], vw)
  td(["qs 6.7.0-6.14.1", "MODERATE", "arrayLimit bypass causing DoS"], vw)

  // ════════════════════════════════════════════════════════════════
  //  SECTION 5 — DATA INTEGRITY
  // ════════════════════════════════════════════════════════════════
  sectionHeading("5", "Data Integrity")

  p("Score: 4/10. Serious concerns around number generation, decimal handling, status management, and cascading deletes.")

  sub("Number Generation — Race Conditions")
  const nw = [60, 180, CW - 240]
  th(["ID", "Finding", "Risk"], nw)
  td(["DATA-01", "Dual project number generation", "Duplicate project numbers on concurrent conversions"], nw)
  td(["DATA-02", "Dual quote number generation", "Duplicate quote numbers from convert route"], nw)
  td(["DATA-03", "Dual journal number in auto-journal.ts", "Duplicate journals on concurrent invoice posts"], nw)
  td(["DATA-04", "Opportunity quote numbers (findFirst+1)", "Race condition on concurrent submissions"], nw)

  doc.moveDown(0.3)
  sub("Decimal/Money Handling")
  p("Only 8 of 117 routes that handle money use the toDecimal() utility. The remaining 109 use parseFloat() or Number(), introducing IEEE 754 floating-point precision errors into financial calculations.")
  b("The toDecimal() utility itself has a bug — it converts through Number() before wrapping in Prisma.Decimal, losing precision. Should use new Prisma.Decimal(String(value)).")
  b("The decimal.js library is installed but only used in 3 files. All server-side financial aggregations (quote totals, PO totals, NCR costs, BOM costs) use plain JavaScript arithmetic.")
  b("Quote margin calculations use (totalSell - totalCost) / totalSell * 100 in floating point.")

  sub("Status Transition Validation")
  p("No server-side status transition validation exists on any model. The PATCH handlers accept any status value:")
  b("A project can jump from OPPORTUNITY to COMPLETE, or go backwards from INSTALLATION to DESIGN")
  b("A quote can jump from DRAFT to ACCEPTED without being SUBMITTED")
  b("A cancelled PO can be moved to COMPLETE")
  b("An invoice status can be changed freely regardless of payment state")

  sub("Cascade Delete Risks")
  criticalCallout("Deleting a project cascade-deletes ALL financial records — purchase orders, invoices, retentions, variations, NCRs, production tasks, and design cards. One accidental delete wipes all project financials. The delete will also fail partway through if ProjectNotes or ProcurementEnquiries exist (no cascade defined).")
  b("NCRs can be hard-deleted — quality records should be immutable once raised")
  b("Prospect delete cascades all opportunities and quote lines with zero guards")
  b("No soft-delete pattern exists anywhere in the schema")

  sub("Missing Database Indexes")
  p("~35 foreign key fields have no database index. The highest-impact missing indexes are QuoteLine.quoteId and PurchaseOrderLine.poId — these child tables are always queried by parent FK and will do full table scans without indexes.")

  // ════════════════════════════════════════════════════════════════
  //  SECTION 6 — PERFORMANCE
  // ════════════════════════════════════════════════════════════════
  sectionHeading("6", "Performance")

  p("Score: 5/10. Good loading skeletons and parallel query patterns, but caching is broken across the board.")

  sub("Broken Caching (force-dynamic overrides revalidate)")
  p("22 pages set both export const dynamic = 'force-dynamic' and export const revalidate = N. In Next.js, force-dynamic completely overrides revalidate, making it dead code. Every page load hits the database fresh.")
  b("Home dashboard: 22+ Prisma queries per load (force-dynamic)")
  b("Reports page: ~12 queries fetching entire tables — all projects, all products, all NCRs, all quotes")
  b("Design page: 4 parallel queries with deep nesting")
  b("Production page: 4 parallel queries")
  p("For a 22-person company, ISR with revalidate: 30 would serve nearly all pages and massively reduce database load.")

  sub("What's Working Well")
  b("Prisma singleton with pg.Pool connection pooling (max 5, min 0 — correct for serverless)")
  b("No N+1 query patterns — consistent use of Promise.all() for parallel queries")
  b("17 top-level loading skeletons covering all major routes")
  b("Lucide and Radix optimised via optimizePackageImports")
  b("No Prisma imports in client components")
  b("PDFKit correctly externalised via serverExternalPackages")

  // ════════════════════════════════════════════════════════════════
  //  SECTION 7 — CODE QUALITY
  // ════════════════════════════════════════════════════════════════
  sectionHeading("7", "Code Quality")

  p("Score: 6/10. Clean codebase with strict TypeScript, but zero test coverage and some type safety gaps in the catalogue module.")

  sub("Strengths")
  b("TypeScript strict: true enabled")
  b("No commented-out code blocks found")
  b("Consistent error handling pattern across most routes")
  b("No dead or orphaned files detected")
  b("Clean import organisation")

  sub("Issues")
  const cw = [70, 80, CW - 150]
  th(["ID", "Severity", "Finding"], cw)
  td(["CQ-01", "HIGH", "Zero unit/integration tests. No test framework configured."], cw)
  td(["CQ-02", "MEDIUM", "26 'as any' casts in catalogue module (Prisma type depth workaround)"], cw)
  td(["CQ-03", "MEDIUM", "1 @ts-nocheck on catalogue/seed/route.ts"], cw)
  td(["CQ-04", "MEDIUM", "16 react-hooks/exhaustive-deps suppressions in finance pages"], cw)
  td(["CQ-05", "MEDIUM", "22 routes with no try/catch, including write operations"], cw)
  td(["CQ-06", "LOW", "Unstructured logging — all errors via console.error()"], cw)

  // ════════════════════════════════════════════════════════════════
  //  SECTION 8 — COMPLIANCE
  // ════════════════════════════════════════════════════════════════
  sectionHeading("8", "Compliance & Audit Trails")

  p("Score: 4/10. Audit logging exists but covers only ~30% of write operations. The NCR workflow is incomplete for ISO 9001. Financial records lack immutability.")

  sub("Audit Logging Coverage")
  const aw = [120, 180, CW - 300]
  th(["Module", "Logged", "Missing"], aw)
  td(["Design", "Job cards, handovers, assignments", "Card schedule changes"], aw)
  td(["Production", "Tasks, moves", "—"], aw)
  td(["CRM", "Create, convert", "Update, delete"], aw)
  td(["Projects", "Activate design only", "Create, update, delete"], aw)
  td(["Quotes", "None", "All operations"], aw)
  td(["Purchase Orders", "None", "All operations"], aw)
  td(["NCRs", "None", "All operations"], aw)
  td(["Sales Invoices", "None", "All operations"], aw)
  td(["Finance (all)", "None", "All operations"], aw)
  td(["Suppliers", "None", "All operations"], aw)
  td(["Users", "None", "All operations"], aw)
  doc.moveDown(0.2)
  callout("The AccountingAuditLog model exists in the Prisma schema but has zero references in any finance route handler — it was created and never wired up.")

  sub("Financial Immutability")
  const fw = [120, 140, 100, CW - 360]
  th(["Document", "Editable after approval?", "Deletable?", "Audit logged?"], fw)
  td(["Quotes", "Yes — no status guard", "Yes — any status", "No"], fw)
  td(["Sales Invoices", "Yes — PAID can be edited", "Yes — any status", "No"], fw)
  td(["Purchase Invoices", "Yes — posted can be edited", "Only ACC_DRAFT", "No"], fw)
  td(["Journal Entries", "No — reverse only (correct)", "No DELETE handler", "No"], fw)
  doc.moveDown(0.2)
  p("Journal entries follow correct accounting practice — posted journals can only be reversed, creating a proper audit trail. This pattern should be applied to invoices and quotes.")

  sub("NCR Workflow vs ISO 9001")
  b("Status transitions are unconstrained — OPEN can go directly to CLOSED without investigation")
  b("No required fields for close-out (root cause, corrective action not enforced)")
  b("No sign-off process — no closedById or reviewer field")
  b("No investigation or corrective action text fields on the model")
  b("NCRs can be hard-deleted — quality records should be immutable")

  // ════════════════════════════════════════════════════════════════
  //  SECTION 9 — REMEDIATION PLAN
  // ════════════════════════════════════════════════════════════════
  sectionHeading("9", "Prioritised Remediation Plan")

  sub("P0 — Critical (Fix Before Production)")
  p("These 7 items could cause data loss, financial errors, or security breaches TODAY.")
  const rw = [60, 80, CW - 140]
  th(["ID", "Area", "Finding & Fix"], rw)
  td(["SEC-02", "Security", "Delete setup-sales/route.ts (admin user creation, no auth)"], rw)
  td(["SEC-03", "Security", "Add auth + permissions to all 60+ finance routes"], rw)
  td(["SEC-04", "Security", "Add auth to portal token generation"], rw)
  td(["SEC-01", "Security", "Systematic auth pass on all mutative routes"], rw)
  td(["DATA-01", "Data", "Replace findFirst+1 with getNextSequenceNumber in convert route (projects)"], rw)
  td(["DATA-02", "Data", "Same fix for quote numbers in convert route"], rw)
  td(["DATA-03", "Data", "Replace auto-journal getNextJournalNumber with sequence counter"], rw)

  doc.moveDown(0.4)
  sub("P1 — High (Fix Within First Month)")
  p("These 10 items will cause problems within months of production use.")
  th(["ID", "Area", "Finding & Fix"], rw)
  td(["SEC-06", "Security", "Wire validateBody() + Zod into all POST/PATCH routes"], rw)
  td(["DATA-05", "Data", "Fix toDecimal() — use Prisma.Decimal(String(value))"], rw)
  td(["DATA-06", "Data", "Replace parseFloat with toDecimal() in 109 finance routes"], rw)
  td(["DATA-09", "Data", "Add status transition state machines (Project, Quote, PO)"], rw)
  td(["DATA-11", "Data", "Add @@index to ~35 missing FK indexes"], rw)
  td(["DATA-12", "Data", "Soft-delete for projects, remove cascade-delete on financials"], rw)
  td(["COMP-01", "Compliance", "Wire logAudit() into all POST/PATCH/DELETE handlers"], rw)
  td(["COMP-02", "Compliance", "Wire AccountingAuditLog into finance routes"], rw)
  td(["COMP-03", "Compliance", "Add status guards (block editing ACCEPTED quotes, PAID invoices)"], rw)
  td(["COMP-04", "Compliance", "Remove NCR DELETE handler or implement soft-delete"], rw)

  doc.moveDown(0.4)
  sub("P2 — Medium (Fix Within Quarter)")
  p("Technical debt that slows development and degrades performance.")
  th(["ID", "Area", "Finding & Fix"], rw)
  td(["PERF-01", "Performance", "Remove force-dynamic from dashboard (22+ queries per load)"], rw)
  td(["PERF-02", "Performance", "Fix caching on 22 pages (remove force-dynamic, use revalidate)"], rw)
  td(["PERF-03", "Performance", "Add pagination/limits to reports page queries"], rw)
  td(["CQ-01", "Quality", "Set up Vitest, start with BOM calculator + quote calcs"], rw)
  td(["CQ-02", "Quality", "Replace 26 'as any' with repository delegate pattern"], rw)
  td(["ARCH-01", "Arch", "Remove phantom dependencies (recharts, xlsx)"], rw)
  td(["DATA-13", "Data", "Add soft-delete pattern to key models"], rw)

  // ════════════════════════════════════════════════════════════════
  //  SECTION 10 — CONCLUSION
  // ════════════════════════════════════════════════════════════════
  sectionHeading("10", "Conclusion & Recommended Sequence")

  sub("Production-Readiness Verdict")
  callout("READY WITH CAVEATS — The P0 items (7 findings) must be addressed before go-live. The architectural foundation is sound and the fixes are mechanical, not rewrites. With focused hardening work (estimated 2-3 days for P0, 2 weeks for P1), ETHOS can reach production-ready status.", AMBER, "#fffbeb")

  sub("Single Most Important Fix")
  p("Delete api/setup-sales/route.ts and wire requireAuth() + requirePermission() into all finance module routes. This closes the two widest security gaps with a single focused effort.")

  sub("Recommended Remediation Sequence")
  bb("Day 1:", "Delete setup-sales. Add auth to finance routes. Add auth to portal tokens.")
  bb("Week 1:", "Fix dual number generation. Fix toDecimal() precision. Add status validation. Add missing DB indexes.")
  bb("Week 2:", "Replace parseFloat across finance routes. Wire audit logging into all writes. Add financial immutability guards.")
  bb("Week 3:", "Input validation pass — Zod schemas on all POST/PATCH. Auth pass on remaining routes.")
  bb("Week 4:", "Fix caching (remove force-dynamic). Add loading states for nested routes. Remove phantom deps.")
  bb("Ongoing:", "Unit test coverage. NCR workflow enhancement. Soft-delete pattern. CI/CD pipeline.")

  doc.moveDown(1)
  doc.save().rect(L, doc.y, CW, 0.5).fill(BORDER).restore()
  doc.y += 16
  doc.font(FONT_LIGHT).fontSize(8).fillColor(LIGHT)
    .text("Report prepared by ETHOS Development Team  |  Document ETHOS-AUDIT-001 v1.0  |  1 March 2026", L, doc.y, { width: CW, align: "center" })

  // ════════════════════════════════════════════════════════════════
  //  HEADERS + FOOTERS
  // ════════════════════════════════════════════════════════════════
  const range = doc.bufferedPageRange()
  const total = range.count

  for (let i = 0; i < total; i++) {
    doc.switchToPage(i)

    if (i === 0) continue // title page already styled

    // Header
    doc.save()
    doc.rect(0, 0, PW, 80).fill(NAVY)
    doc.rect(0, 80, PW, 2.5).fill(CORAL)
    doc.restore()
    doc.image(logoWhitePng, L, 24, { width: 140 })
    doc.font(FONT_LIGHT).fontSize(7.5).fillColor("#ffffff60")
      .text("ETHOS Code Audit Report v1.0", PW - R - 160, 34, { width: 160, align: "right", height: 12 })

    // Footer
    const footY = PH - 40
    doc.save().rect(0, footY - 4, PW, 0.75).fill(CORAL).restore()
    doc.font(FONT_LIGHT).fontSize(7).fillColor(LIGHT)
      .text("ETHOS  |  MM Engineered Solutions  |  CONFIDENTIAL", L, footY, { height: 10 })
    doc.font(FONT_LIGHT).fontSize(7).fillColor(LIGHT)
      .text(`${i + 1}  /  ${total}`, PW - R - 50, footY, { width: 50, align: "right", height: 10 })
  }

  doc.switchToPage(total - 1)
  doc.end()

  ws.on("finish", () => {
    console.log(`Generated: ${out}`)
    console.log(`${total} pages`)
  })
}

main().catch(console.error)
