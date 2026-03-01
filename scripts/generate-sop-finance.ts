/**
 * Generate Finance SOP PDF
 * Uses the actual MME coral logo + PX Grotesk brand font
 * Usage: npx tsx scripts/generate-sop-finance.ts
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
      Title: "ETHOS — Finance SOP",
      Author: "MM Engineered Solutions",
      Subject: "ETHOS Finance SOP v1.0",
    },
  })

  const out = path.join(__dirname, "..", "ETHOS-Finance-SOP.pdf")
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
    .text("Finance", 0, doc.y, { width: PW, align: "center" })
  doc.moveDown(0.2)
  doc.font(FONT_LIGHT).fontSize(18).fillColor(CORAL)
    .text("ETHOS System Guide", 0, doc.y, { width: PW, align: "center" })

  doc.y = 540
  doc.font(FONT_LIGHT).fontSize(10).fillColor("#ffffff80")
    .text("ETHOS ERP  |  Finance & Accounting", 0, doc.y, { width: PW, align: "center" })
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
    "1.   Overview",
    "2.   Chart of Accounts",
    "3.   Journal Entries",
    "4.   Sales Ledger",
    "5.   Purchase Ledger",
    "6.   Banking",
    "7.   Construction Contracts",
    "8.   Tax & VAT",
    "9.   Fixed Assets & Depreciation",
    "10.  Reports",
    "11.  Year-End",
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

  // ── 1 ──────────────────────────────────────────────────────────
  sectionHeading("1", "Overview")
  p("The ETHOS Finance module is a full double-entry accounting system built specifically for MM Engineered Solutions. It replaces the need for standalone accounting software by providing integrated ledgers, bank management, VAT compliance, and construction contract accounting — all connected to the wider ETHOS ERP.")
  p("Every financial transaction in the system creates a balanced journal entry where total debits always equal total credits. The module is designed for HMRC Making Tax Digital (MTD) compliance and follows UK GAAP conventions.")

  sub("Core Principles")
  b("Double-entry bookkeeping — every transaction debits one or more accounts and credits one or more accounts")
  b("All amounts use Decimal precision to avoid floating-point rounding errors")
  b("Auto-journal generation — posting a sales invoice, purchase invoice, payment, or bank transfer automatically creates the correct double-entry journal")
  b("Period-based accounting — transactions must be posted to an open accounting period")
  b("Audit trail — journals cannot be deleted, only reversed (creating a counter-entry)")

  sub("Navigation")
  p("The Finance module uses a dedicated sidebar with collapsible sections:")
  b("Overview — Dashboard, Invoicing, Job Costing, Nominal Codes")
  b("Sales — Sales Ledger, Credit Control")
  b("Purchases — Purchase Invoices, Enquiries")
  b("Banking — Bank & Payments, Bank Rules")
  b("Accounting — Chart of Accounts, Journal Entries, Contracts, Fixed Assets, Prepayments, Recurring Entries, Cost Centres")
  b("Tax & Compliance — VAT Returns, Budgets, Reports")
  b("Administration — Periods, Year-End, Import Data, Sage Export, Settings")

  // ── 2 ──────────────────────────────────────────────────────────
  sectionHeading("2", "Chart of Accounts")
  p("The Chart of Accounts is the foundation of the accounting system. Every nominal account has a code, name, type, and normal balance direction. Accounts support a parent/child hierarchy for structured reporting.")

  sub("Account Types")
  const at1 = 110, at2 = 110, at3 = CW - 220
  th(["Type", "Normal Balance", "Description"], [at1, at2, at3])
  td(["Asset", "Debit", "What the business owns (bank, debtors, stock, fixed assets)"], [at1, at2, at3])
  td(["Liability", "Credit", "What the business owes (creditors, VAT, loans)"], [at1, at2, at3])
  td(["Equity", "Credit", "Owner's capital, retained earnings, share capital"], [at1, at2, at3])
  td(["Revenue", "Credit", "Income from sales, contracts, other sources"], [at1, at2, at3])
  td(["Expense", "Debit", "Costs incurred (materials, labour, overheads)"], [at1, at2, at3])
  doc.moveDown(0.4)

  sub("Key System Accounts")
  p("The following well-known accounts are used by auto-journal functions and must not be renamed or deleted:")
  const ka1 = 80, ka2 = 160, ka3 = CW - 240
  th(["Code", "Name", "Purpose"], [ka1, ka2, ka3])
  td(["1100", "Trade Debtors", "Sales ledger control — total owed by customers"], [ka1, ka2, ka3])
  td(["1200", "Current Account", "Default bank GL account"], [ka1, ka2, ka3])
  td(["1400", "VAT Input", "VAT reclaimable on purchases"], [ka1, ka2, ka3])
  td(["2100", "Trade Creditors", "Purchase ledger control — total owed to suppliers"], [ka1, ka2, ka3])
  td(["2200", "VAT Output", "VAT collected on sales"], [ka1, ka2, ka3])
  td(["2302", "CIS Deductions", "Construction Industry Scheme deductions payable to HMRC"], [ka1, ka2, ka3])
  td(["2400", "Retention Held", "Retention held on construction contracts"], [ka1, ka2, ka3])
  td(["3100", "Retained Earnings", "Cumulative profit/loss carried forward at year-end"], [ka1, ka2, ka3])
  doc.moveDown(0.4)

  sub("Working with Accounts")
  bb("Add Account —", "Finance > Chart of Accounts > Add Account. Enter code, name, type, sub-type, and optional parent account.")
  bb("Hierarchy —", "Accounts can be nested under parent accounts. Click the expand arrow to view children. Use this for grouping (e.g. 4000 Sales under 4xxx Revenue).")
  bb("Filter by Type —", "Use the tab bar (All, Assets, Liabilities, Equity, Revenue, Expenses) to quickly filter the list.")
  bb("Search —", "Search by code or name using the search bar.")
  bb("Activate / Deactivate —", "Toggle the Active/Inactive switch. Inactive accounts cannot receive new postings but retain their history.")
  callout("System accounts (1100, 1200, 2100, 2200, etc.) should never be deactivated — they are required by the auto-journal engine.")

  // ── 3 ──────────────────────────────────────────────────────────
  sectionHeading("3", "Journal Entries")
  p("Journal entries are the atomic unit of the accounting system. Every financial event — invoices, payments, transfers, depreciation — is recorded as a journal entry with balanced debit and credit lines.")

  sub("Journal Statuses")
  const js1 = 120, js2 = CW - 120
  th(["Status", "Meaning"], [js1, js2])
  td(["JOURNAL_DRAFT", "Entry created but not posted. Can be edited or deleted."], [js1, js2])
  td(["POSTED", "Entry posted to the ledger. Cannot be edited — only reversed."], [js1, js2])
  td(["REVERSED", "A counter-entry has been created to cancel this journal."], [js1, js2])
  doc.moveDown(0.4)

  sub("Creating a Manual Journal")
  p("Navigate to Finance > Journal Entries > New Journal.")
  b("Enter a date, description, and optional reference")
  b("Add two or more lines — each with an account, description, and either a debit or credit amount")
  b("The system validates that total debits equal total credits before allowing save")
  b("Each line can optionally have a VAT code, project, or cost centre tag")
  callout("A journal line must have either a debit OR a credit — never both, never neither. The validation engine enforces this rule.")

  sub("Posting a Journal")
  p("From the journals list, click the green tick icon on any draft entry. Posting is irreversible — the entry locks and updates all affected account balances.")

  sub("Reversing a Journal")
  p("Click the red undo icon on any posted entry. The system creates a new mirror journal that swaps debits and credits, effectively cancelling the original. Both entries remain in the audit trail.")

  sub("Journal Sources")
  p("Every journal records its source for audit purposes:")
  const sr1 = 160, sr2 = CW - 160
  th(["Source", "Created By"], [sr1, sr2])
  td(["MANUAL", "User-created journal entry"], [sr1, sr2])
  td(["SALES_INVOICE", "Auto-journal when a sales invoice is posted"], [sr1, sr2])
  td(["PURCHASE_INVOICE", "Auto-journal when a purchase invoice is posted"], [sr1, sr2])
  td(["CREDIT_NOTE", "Auto-journal when a credit note is posted"], [sr1, sr2])
  td(["BANK_RECEIPT", "Auto-journal when a customer payment is received"], [sr1, sr2])
  td(["BANK_PAYMENT", "Auto-journal when a supplier payment is made"], [sr1, sr2])
  td(["BANK_TRANSFER", "Auto-journal when an inter-bank transfer is made"], [sr1, sr2])
  td(["CONSTRUCTION_APPLICATION", "Auto-journal when a contract application is certified"], [sr1, sr2])
  td(["YEAR_END", "Auto-journal for year-end P&L to retained earnings transfer"], [sr1, sr2])
  doc.moveDown(0.4)

  sub("Auto-Journal Details")
  p("The auto-journal engine (src/lib/finance/auto-journal.ts) creates journals automatically when operational actions occur. Key patterns:")

  subsub("Sales Invoice Posted")
  b("DR Trade Debtors (1100) — gross amount")
  b("CR Revenue account — net amount")
  b("CR VAT Output (2200) — VAT amount")

  subsub("Purchase Invoice Posted")
  b("DR Expense / Cost account — net amount")
  b("DR VAT Input (1400) — VAT amount")
  b("CR Trade Creditors (2100) — gross amount")

  subsub("Customer Payment Received")
  b("DR Bank account — payment amount")
  b("CR Trade Debtors (1100) — payment amount")

  subsub("Supplier Payment Made")
  b("DR Trade Creditors (2100) — payment amount")
  b("CR Bank account — payment amount")

  subsub("Bank Transfer")
  b("DR Destination bank GL account — transfer amount")
  b("CR Source bank GL account — transfer amount")

  subsub("Credit Note")
  b("DR Revenue account — net amount (reversal)")
  b("DR VAT Output (2200) — VAT amount (reversal)")
  b("CR Trade Debtors (1100) — gross amount")

  // ── 4 ──────────────────────────────────────────────────────────
  sectionHeading("4", "Sales Ledger")
  p("The Sales Ledger manages all customer invoicing, credit notes, and receivables tracking. Navigate to Finance > Sales Ledger.")

  sub("Sales Ledger Dashboard")
  p("The landing page shows four summary cards:")
  b("Total Outstanding — all unpaid balances")
  b("Current (0-30 days) — invoices within normal payment terms")
  b("Overdue 30-60 days — amber warning zone")
  b("Overdue 60+ days — red warning zone")

  sub("Invoices")
  p("The Invoices tab lists all sales invoices with columns: Invoice #, Customer, Date, Due Date, Subtotal, VAT, Total, Paid, Outstanding, and Status.")
  bb("New Invoice —", "Click New Invoice to create. Select a customer, add line items with descriptions, quantities, unit prices, VAT codes, and revenue accounts.")
  p("Invoice numbering follows the sequence INV-XXXXXX, auto-generated by the sequence counter.")

  sub("Invoice Statuses")
  const is1 = 140, is2 = CW - 140
  th(["Status", "Meaning"], [is1, is2])
  td(["ACC_DRAFT", "Invoice created, not yet posted to the ledger"], [is1, is2])
  td(["ACC_APPROVED", "Approved but not yet posted"], [is1, is2])
  td(["ACC_POSTED", "Posted — auto-journal created (DR Debtors, CR Revenue, CR VAT)"], [is1, is2])
  td(["ACC_PARTIALLY_PAID", "Some payment received, balance still outstanding"], [is1, is2])
  td(["ACC_PAID", "Fully paid — outstanding amount is zero"], [is1, is2])
  td(["ACC_CANCELLED", "Invoice voided"], [is1, is2])
  doc.moveDown(0.4)

  sub("Credit Notes")
  p("Credit notes reverse all or part of a sales invoice. They follow the same workflow but create a reversal auto-journal (DR Revenue, CR Trade Debtors). Numbering uses the CN-XXXXXX sequence.")

  sub("Customers")
  p("The Customers tab lists all customer accounts with code, name, contact details, outstanding balance, and active status. Each customer has a unique code (CUST-XXXXXX).")

  sub("Credit Control")
  p("Navigate to Finance > Credit Control for a dedicated debt-chasing view.")
  b("Summary cards: Total Overdue, 30+ days, 60+ days, 90+ days")
  b("Customer list sorted by days overdue or outstanding amount")
  b("Each customer shows contact details, oldest invoice date, number of overdue invoices, credit limit")
  b("Chasing actions: Reminder 1, Reminder 2, Reminder 3, Final Demand, Phone Call, Account on Hold, Legal Action, Write Off")
  b("Next follow-up date tracking — overdue follow-ups highlighted in red")
  callout("Click any customer row to open their detailed credit control page with full invoice breakdown and action history.")

  sub("Aged Debtors Report")
  p("Finance > Sales > Aged Debtors provides a breakdown of all outstanding invoices grouped into ageing bands: Current, 30 days, 60 days, 90+ days. Available from the quick links at the bottom of the Sales Ledger page.")

  sub("Customer Statements")
  p("Finance > Sales > Statements > [Customer] generates a statement for a specific customer showing all transactions and running balance.")

  // ── 5 ──────────────────────────────────────────────────────────
  sectionHeading("5", "Purchase Ledger")
  p("The Purchase Ledger manages supplier invoices, credit notes, and payables. Navigate to Finance > Purchase Invoices.")

  sub("Purchase Ledger Dashboard")
  p("Mirrors the Sales Ledger layout with summary cards for outstanding creditor balances across ageing bands, plus tabs for Invoices, Credit Notes, and Suppliers.")

  sub("Purchase Invoices")
  bb("New Invoice —", "Click New Invoice to create. Select a supplier, enter the supplier's invoice number, add line items with expense account coding, VAT treatment, and optional project/cost centre tags.")
  p("Invoice numbering uses the PIN-XXXXXX sequence.")
  p("Posting a purchase invoice creates the auto-journal: DR Expense (net), DR VAT Input (VAT), CR Trade Creditors (gross).")

  sub("Suppliers")
  p("Each supplier has a unique code (SUPP-XXXXXX), contact details, and an outstanding balance. Click any supplier row to view their account detail.")

  sub("Aged Creditors Report")
  p("Finance > Purchases > Aged Creditors provides a breakdown of all outstanding purchase invoices grouped by ageing bands.")

  sub("Supplier Statements")
  p("Finance > Purchases > Statements > [Supplier] generates a reconciliation statement to compare against the supplier's own records.")

  sub("Purchase Orders")
  p("Link to purchase orders is available from the Purchase Ledger header. Purchase orders use the PO-XXXXXX sequence and can be matched against purchase invoices for three-way matching.")

  // ── 6 ──────────────────────────────────────────────────────────
  sectionHeading("6", "Banking")
  p("The Banking module manages bank accounts, transactions, receipts, payments, transfers, and reconciliation. Navigate to Finance > Bank & Payments.")

  sub("Bank Account Setup")
  p("Each bank account record stores: account name, account number, sort code, current balance, currency, and a link to its GL account (nominal code) in the Chart of Accounts.")
  bb("New Account —", "Finance > Bank & Payments > New Account. Enter the details and select the GL nominal code to link.")

  sub("Dashboard")
  p("The Bank & Payments page shows:")
  b("Summary cards: Total Balance (across all accounts), Active Accounts count, Unreconciled transaction count")
  b("Bank Account cards — each showing name, sort code/account number, current balance, and reconciliation status")
  b("Recent Transactions table — date, account, description, reference, amount (green for receipts, red for payments), reconciliation status")

  sub("Receive Payment")
  p("Finance > Bank > Receive Payment. Records a customer payment:")
  b("Select the bank account, customer, and amount")
  b("Allocate against one or more outstanding sales invoices")
  b("Auto-journal: DR Bank, CR Trade Debtors (1100)")
  b("Invoice status updates to Partially Paid or Paid depending on remaining balance")

  sub("Make Payment")
  p("Finance > Bank > Make Payment. Records a supplier payment:")
  b("Select the bank account, supplier, and amount")
  b("Allocate against one or more outstanding purchase invoices")
  b("Auto-journal: DR Trade Creditors (2100), CR Bank")

  sub("Bank Transfer")
  p("Finance > Bank > Transfer. Moves funds between bank accounts:")
  b("Select source and destination bank accounts, enter the amount")
  b("Auto-journal: DR Destination Bank GL, CR Source Bank GL")

  sub("Bank Reconciliation")
  p("Finance > Bank > [Account] > Reconcile. The reconciliation screen allows you to match transactions against your bank statement:")
  b("Upload or view the bank statement")
  b("Tick transactions that appear on the statement")
  b("The reconciliation summary shows the statement balance vs book balance and any difference")
  b("Once all items are matched and the difference is zero, mark the reconciliation as complete")
  callout("Unreconciled transactions show a yellow warning badge on the bank account card. Fully reconciled accounts show a green tick.")

  sub("Statement Import")
  p("Finance > Bank > [Account] > Import. Upload CSV or OFX bank statement files to automatically create transactions for matching.")

  sub("Bank Rules")
  p("Finance > Bank Rules. Set up automatic categorisation rules for imported transactions. Rules match on description patterns and assign the correct nominal code, VAT treatment, and project tag.")

  // ── 7 ──────────────────────────────────────────────────────────
  sectionHeading("7", "Construction Contracts")
  p("The Construction Contracts module handles NEC and JCT contract accounting, applications for payment, retention, and CIS deductions. Navigate to Finance > Contracts.")

  sub("Contract Types")
  const ct1 = 130, ct2 = CW - 130
  th(["Type", "Description"], [ct1, ct2])
  td(["NEC", "NEC Engineering and Construction Contract"], [ct1, ct2])
  td(["JCT", "JCT Standard Building Contract"], [ct1, ct2])
  td(["Bespoke", "Custom contract terms"], [ct1, ct2])
  doc.moveDown(0.4)

  sub("Contract Lifecycle")
  const cl1 = 150, cl2 = CW - 150
  th(["Status", "Meaning"], [cl1, cl2])
  td(["Draft", "Contract created, not yet active"], [cl1, cl2])
  td(["Active", "Work in progress, applications can be submitted"], [cl1, cl2])
  td(["Practical Completion", "Works substantially complete, defects period begins"], [cl1, cl2])
  td(["Defects Liability", "Defects liability period in progress"], [cl1, cl2])
  td(["Final Account", "Final account negotiation/agreement stage"], [cl1, cl2])
  td(["Closed", "Contract fully completed and closed"], [cl1, cl2])
  doc.moveDown(0.4)

  sub("Contract Dashboard")
  p("The contracts list shows summary cards:")
  b("Active Contracts — number of contracts currently in progress")
  b("Total Contract Value — sum of all current contract values (including variations)")
  b("Certified to Date — total value certified by the contract administrator")
  b("Retention Held — total retention deducted and held")
  b("Outstanding Applications — applications awaiting certification or payment")

  sub("Creating a Contract")
  bb("New Contract —", "Finance > Contracts > New Contract. Enter contract reference, client name, type (NEC/JCT/Bespoke), original value, retention percentage, defects period, and revenue account.")

  sub("Applications for Payment")
  p("Within each contract, you can create applications for payment:")
  b("Finance > Contracts > [Contract] > Applications > New Application")
  b("Enter the gross valuation for the period, cumulative to date, and any materials on site")
  b("The system calculates retention to be held and CIS deductions (if applicable)")
  b("Net payable = Gross valuation - Retention - CIS deductions")

  sub("Application Certified Auto-Journal")
  p("When an application is certified, the auto-journal engine creates:")
  b("DR Trade Debtors (net payable after retention and CIS)")
  b("DR Retention Held (2400) — retention amount")
  b("CR Revenue account — gross valuation")
  b("CR CIS Deductions (2302) — if CIS applies")

  sub("Retention Management")
  p("Finance > Contracts > Retention provides a dedicated view of all retention held across contracts, with release tracking for both first-half and second-half retention.")

  sub("Variations")
  p("Contract variations change the current contract value. The table shows both original value and current value, with the difference highlighted in blue when variations exist.")

  // ── 8 ──────────────────────────────────────────────────────────
  sectionHeading("8", "Tax & VAT")
  p("The VAT module manages VAT codes, calculates VAT returns, and supports HMRC Making Tax Digital (MTD) submissions. Navigate to Finance > VAT Returns.")

  sub("VAT Codes")
  p("Finance > VAT Returns > Manage Codes (or Finance > VAT > Codes). Each VAT code defines:")
  b("Code identifier (e.g. T0, T1, T2, T5, T9)")
  b("Description (e.g. Zero Rated, Standard Rate, Exempt)")
  b("Rate percentage (e.g. 0%, 20%)")
  b("Whether it appears on VAT returns")
  b("Whether it applies to sales, purchases, or both")

  sub("VAT Returns")
  p("The VAT Returns page shows:")
  b("Summary: Next return due (from periods without returns), last submitted return, outstanding VAT liability")
  b("Returns table: Period, dates, Box 1 (Output VAT), Box 4 (Input VAT), Box 5 (Net VAT), status")

  sub("VAT Return Statuses")
  const vs1 = 130, vs2 = CW - 130
  th(["Status", "Meaning"], [vs1, vs2])
  td(["VAT_DRAFT", "Return created but not yet calculated"], [vs1, vs2])
  td(["CALCULATED", "Figures calculated from posted journals in the period"], [vs1, vs2])
  td(["VAT_APPROVED", "Reviewed and approved, ready for submission"], [vs1, vs2])
  td(["VAT_SUBMITTED", "Submitted to HMRC"], [vs1, vs2])
  td(["ERROR", "Submission failed or data issue"], [vs1, vs2])
  doc.moveDown(0.4)

  sub("Calculating a Return")
  p("Click Calculate Return on any period awaiting a VAT return. The system aggregates all posted journal lines tagged with VAT codes in the period and produces the nine-box VAT100 form:")
  b("Box 1 — VAT due on sales and other outputs")
  b("Box 2 — VAT due on acquisitions from EU member states")
  b("Box 3 — Total VAT due (Box 1 + Box 2)")
  b("Box 4 — VAT reclaimed on purchases and other inputs")
  b("Box 5 — Net VAT to pay or reclaim (Box 3 - Box 4)")
  b("Box 6 — Total value of sales excluding VAT")
  b("Box 7 — Total value of purchases excluding VAT")
  b("Box 8 — Total value of supplies to EU member states")
  b("Box 9 — Total value of acquisitions from EU member states")
  callout("Box 5 positive = owed to HMRC (shown in red). Box 5 negative = due from HMRC (shown in green).")

  // ── 9 ──────────────────────────────────────────────────────────
  sectionHeading("9", "Fixed Assets & Depreciation")
  p("The Fixed Assets Register tracks all capitalised assets, manages depreciation calculations, and handles disposals. Navigate to Finance > Fixed Assets.")

  sub("Asset Register Overview")
  p("The landing page shows summary cards: Total Assets count, Total Cost, Total Net Book Value (NBV), and Monthly Depreciation charge.")

  sub("Asset Record")
  p("Each fixed asset record contains:")
  b("Asset code (FA-XXXXXX, auto-generated)")
  b("Name and description")
  b("Category (linked to a depreciation method)")
  b("Purchase date and purchase cost")
  b("Residual / scrap value")
  b("Accumulated depreciation (running total of depreciation charged)")
  b("Net Book Value (cost minus accumulated depreciation)")
  b("Serial number and location (optional)")
  b("Status: Active, Disposed, Fully Depreciated, Written Off")

  sub("Asset Categories")
  p("Finance > Fixed Assets > Categories. Each category defines the depreciation method for all assets assigned to it:")
  b("Straight Line — equal annual charge over the useful life")
  b("Reducing Balance — percentage of the remaining book value each year")

  sub("Running Depreciation")
  p("Finance > Fixed Assets > Run Depreciation. Select a period and the system calculates the depreciation charge for each active asset based on its category method. A depreciation journal is created automatically.")

  sub("Asset Statuses")
  const as1 = 150, as2 = CW - 150
  th(["Status", "Meaning"], [as1, as2])
  td(["Active", "In use, depreciation runs monthly"], [as1, as2])
  td(["Disposed", "Sold or scrapped — disposal proceeds and gain/loss recorded"], [as1, as2])
  td(["Fully Depreciated", "NBV has reached the residual value — no further depreciation"], [as1, as2])
  td(["Written Off", "Asset removed from register as a write-off"], [as1, as2])
  doc.moveDown(0.4)

  sub("Disposal")
  p("When disposing of an asset, record the disposal date, proceeds, and method. The system calculates the gain or loss on disposal (proceeds minus NBV) and creates the appropriate journal entries.")

  // ── 10 ─────────────────────────────────────────────────────────
  sectionHeading("10", "Reports")
  p("The Reports hub provides all key financial reports. Navigate to Finance > Reports.")

  sub("Available Reports")
  const rp1 = 150, rp2 = CW - 150
  th(["Report", "Description"], [rp1, rp2])
  td(["Trial Balance", "All account balances for a period — verifies debits equal credits"], [rp1, rp2])
  td(["Profit & Loss", "Income and expenditure statement for a period or date range"], [rp1, rp2])
  td(["Balance Sheet", "Statement of financial position — assets, liabilities, equity"], [rp1, rp2])
  td(["Aged Debtors", "Outstanding sales invoices grouped by ageing bands"], [rp1, rp2])
  td(["Aged Creditors", "Outstanding purchase invoices grouped by ageing bands"], [rp1, rp2])
  td(["VAT Report", "VAT summary with box-by-box breakdown for HMRC"], [rp1, rp2])
  td(["Nominal Activity", "Transaction-level detail for any nominal account over a date range"], [rp1, rp2])
  td(["Job Costing", "Revenue and cost analysis by project or job code"], [rp1, rp2])
  doc.moveDown(0.4)

  sub("Trial Balance")
  p("The trial balance lists every account with a non-zero balance, showing debit and credit totals. The totals must agree (debits = credits). If they do not, it indicates a posting error that must be investigated.")

  sub("Profit & Loss")
  p("Shows Revenue accounts (credit balances) minus Expense accounts (debit balances) for the selected period. The bottom line is net profit or net loss.")

  sub("Balance Sheet")
  p("Shows the financial position at a point in time: Total Assets = Total Liabilities + Total Equity. This report pulls from Asset, Liability, and Equity type accounts.")

  sub("Job Costing")
  p("Analyses revenue and costs posted against specific projects. Shows gross margin per job, which is critical for MME's project-based work streams (Utility, Bespoke, Community, Blast, Refurbishment).")

  sub("Nominal Activity")
  p("Select any nominal account and a date range to see every journal line posted to that account — useful for drilling down from trial balance variances.")

  // ── 11 ─────────────────────────────────────────────────────────
  sectionHeading("11", "Year-End")
  p("Year-end processing closes the financial year, transfers the profit or loss to retained earnings, and creates the next year's accounting periods. Navigate to Finance > Year-End.")

  sub("Year-End Wizard")
  p("The year-end process follows a four-step wizard:")

  // Visual flow
  const steps = [
    { label: "Select Period", note: "Choose year-end period and retained earnings account" },
    { label: "Preview", note: "Review P&L, closing journal, periods to lock" },
    { label: "Confirm", note: "Final confirmation — irreversible action" },
    { label: "Complete", note: "Closing journal posted, periods locked, new year created" },
  ]
  const BW = 200, BH = 32
  const BX = (PW - BW) / 2

  ensureSpace(steps.length * 52 + 60)

  steps.forEach((item, i) => {
    const by = doc.y
    doc.save().roundedRect(BX, by, BW, BH, 4).fill(NAVY).restore()
    doc.font(FONT_BOLD).fontSize(9).fillColor(WHITE)
      .text(item.label, BX, by + 6, { width: BW, align: "center" })
    doc.font(FONT_LIGHT).fontSize(7).fillColor("#ffffff70")
      .text(item.note, BX, by + 19, { width: BW, align: "center" })
    doc.y = by + BH + 3
    if (i < steps.length - 1) {
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
    .text("YEAR CLOSED", BX, fy + 10, { width: BW, align: "center" })
  doc.y = fy + BH + 12

  sub("Step 1 — Select Period")
  b("Choose the accounting period marked as the year-end period")
  b("Select the retained earnings equity account (usually 3100 Retained Earnings)")
  b("Only periods not already locked are available for selection")

  sub("Step 2 — Preview")
  p("The preview shows:")
  b("P&L summary — total revenue, total expenses, net profit or loss")
  b("Revenue and expense account breakdowns with individual balances")
  b("Closing journal entry preview — the balanced journal that will be posted")
  b("List of periods that will be locked")
  b("Any warnings (e.g. open periods that haven't been closed)")

  sub("Step 3 — Confirm")
  p("Final confirmation screen. This action is irreversible. Shows a summary of what will happen.")

  sub("Step 4 — Complete")
  p("After processing completes, the system:")
  b("Creates and posts the closing journal entry (transfers all P&L balances to Retained Earnings)")
  b("Locks all periods in the financial year — no further postings allowed")
  b("Creates 12 new monthly accounting periods for the next financial year")
  b("Marks the last new period as the next year-end")
  callout("Year-end processing is permanent. Ensure all reconciliations, adjustments, and reviews are complete before proceeding.")

  sub("Accounting Periods")
  p("Finance > Periods shows all accounting periods with their status:")
  const pp1 = 120, pp2 = CW - 120
  th(["Status", "Meaning"], [pp1, pp2])
  td(["OPEN", "Journals can be posted to this period"], [pp1, pp2])
  td(["PERIOD_CLOSED", "Temporarily closed — can be reopened by an authorised user"], [pp1, pp2])
  td(["LOCKED", "Permanently locked by year-end processing — cannot be reopened"], [pp1, pp2])
  doc.moveDown(0.4)
  p("Close or reopen periods individually from the Periods page. The current period (today's date falls within its range) is highlighted in blue.")

  // ════════════════════════════════════════════════════════════════
  //  WHERE TO FIND THINGS
  // ════════════════════════════════════════════════════════════════
  ensureSpace(50)
  doc.moveDown(1)
  const wfy = doc.y
  doc.save().rect(L, wfy, 4, 22).fill(CORAL).restore()
  doc.font(FONT_BOLD).fontSize(14).fillColor(NAVY)
    .text("Quick Reference — Where to Find Things", L + 16, wfy + 3, { width: CW - 16 })
  doc.y = wfy + 30
  doc.save().rect(L, doc.y, CW, 0.5).fill(BORDER).restore()
  doc.y += 10

  const n1 = 190, n2 = CW - 190
  th(["Feature", "Location"], [n1, n2])
  td(["Finance Dashboard", "/finance"], [n1, n2])
  td(["Chart of Accounts", "/finance/chart-of-accounts"], [n1, n2])
  td(["Journal Entries", "/finance/journals"], [n1, n2])
  td(["Sales Ledger", "/finance/sales"], [n1, n2])
  td(["Credit Control", "/finance/credit-control"], [n1, n2])
  td(["Aged Debtors", "/finance/sales/aged-debtors"], [n1, n2])
  td(["Purchase Ledger", "/finance/purchases"], [n1, n2])
  td(["Aged Creditors", "/finance/purchases/aged-creditors"], [n1, n2])
  td(["Bank & Payments", "/finance/bank"], [n1, n2])
  td(["Bank Reconciliation", "/finance/bank/accounts/[id]/reconcile"], [n1, n2])
  td(["Bank Rules", "/finance/bank-rules"], [n1, n2])
  td(["Construction Contracts", "/finance/contracts"], [n1, n2])
  td(["Retention Tracking", "/finance/contracts/retention"], [n1, n2])
  td(["VAT Returns", "/finance/vat"], [n1, n2])
  td(["VAT Codes", "/finance/vat/codes"], [n1, n2])
  td(["Fixed Assets", "/finance/fixed-assets"], [n1, n2])
  td(["Run Depreciation", "/finance/fixed-assets/depreciation"], [n1, n2])
  td(["Asset Categories", "/finance/fixed-assets/categories"], [n1, n2])
  td(["Reports Hub", "/finance/reports"], [n1, n2])
  td(["Trial Balance", "/finance/reports/trial-balance"], [n1, n2])
  td(["Profit & Loss", "/finance/reports/profit-and-loss"], [n1, n2])
  td(["Balance Sheet", "/finance/reports/balance-sheet"], [n1, n2])
  td(["Job Costing", "/finance/reports/job-costing"], [n1, n2])
  td(["Nominal Activity", "/finance/reports/nominal-activity"], [n1, n2])
  td(["Accounting Periods", "/finance/periods"], [n1, n2])
  td(["Year-End Processing", "/finance/year-end"], [n1, n2])
  td(["Recurring Entries", "/finance/recurring"], [n1, n2])
  td(["Prepayments", "/finance/prepayments"], [n1, n2])
  td(["Cost Centres", "/finance/cost-centres"], [n1, n2])
  td(["Budgets", "/finance/budgets"], [n1, n2])
  td(["Sage Export", "/finance/exports"], [n1, n2])
  td(["Import Data", "/finance/import"], [n1, n2])
  td(["Finance Settings", "/finance/settings"], [n1, n2])

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
      .text("ETHOS Finance v1.0", PW - R - 140, 34, { width: 140, align: "right", height: 12 })

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
