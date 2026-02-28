/**
 * Finance Module Seed Data
 * Seeds: Chart of Accounts (44), VAT Codes (8), Accounting Periods (12), Sequence Counters (10)
 * Safe to run multiple times — uses upsert on unique fields.
 */
import "dotenv/config"
import pg from "pg"

async function main() {
  const client = new pg.Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })

  await client.connect()
  console.log("Connected to database")

  // ============================================================
  // CHART OF ACCOUNTS — UK Standard (Sage 200 aligned)
  // ============================================================
  console.log("\n--- Seeding Chart of Accounts ---")

  const accounts: {
    code: string
    name: string
    type: string
    normalBalance: string
    subType?: string
    vatCode?: string
    isSystemAccount?: boolean
    description?: string
  }[] = [
    // --- ASSETS (1000–1599) ---
    { code: "1000", name: "Freehold Property", type: "ASSET", normalBalance: "DEBIT", subType: "Fixed Assets" },
    { code: "1001", name: "Leasehold Property", type: "ASSET", normalBalance: "DEBIT", subType: "Fixed Assets" },
    { code: "1010", name: "Plant and Machinery", type: "ASSET", normalBalance: "DEBIT", subType: "Fixed Assets" },
    { code: "1011", name: "Plant/Machinery Depreciation", type: "ASSET", normalBalance: "DEBIT", subType: "Fixed Assets", description: "Accumulated depreciation on plant & machinery" },
    { code: "1020", name: "Fixtures and Fittings", type: "ASSET", normalBalance: "DEBIT", subType: "Fixed Assets" },
    { code: "1021", name: "Fixtures/Fittings Depreciation", type: "ASSET", normalBalance: "DEBIT", subType: "Fixed Assets", description: "Accumulated depreciation on fixtures & fittings" },
    { code: "1030", name: "Motor Vehicles", type: "ASSET", normalBalance: "DEBIT", subType: "Fixed Assets" },
    { code: "1031", name: "Motor Vehicles Depreciation", type: "ASSET", normalBalance: "DEBIT", subType: "Fixed Assets", description: "Accumulated depreciation on motor vehicles" },
    { code: "1040", name: "Office Equipment", type: "ASSET", normalBalance: "DEBIT", subType: "Fixed Assets" },
    { code: "1041", name: "Office Equipment Depreciation", type: "ASSET", normalBalance: "DEBIT", subType: "Fixed Assets", description: "Accumulated depreciation on office equipment" },
    { code: "1050", name: "Computer Equipment", type: "ASSET", normalBalance: "DEBIT", subType: "Fixed Assets" },
    { code: "1051", name: "Computer Equipment Depreciation", type: "ASSET", normalBalance: "DEBIT", subType: "Fixed Assets", description: "Accumulated depreciation on computer equipment" },
    { code: "1100", name: "Trade Debtors", type: "ASSET", normalBalance: "DEBIT", subType: "Current Assets", isSystemAccount: true, description: "Sales ledger control" },
    { code: "1101", name: "Other Debtors", type: "ASSET", normalBalance: "DEBIT", subType: "Current Assets" },
    { code: "1102", name: "Prepayments", type: "ASSET", normalBalance: "DEBIT", subType: "Current Assets" },
    { code: "1103", name: "Accrued Income", type: "ASSET", normalBalance: "DEBIT", subType: "Current Assets" },
    { code: "1200", name: "Current Account", type: "ASSET", normalBalance: "DEBIT", subType: "Bank", isSystemAccount: true },
    { code: "1210", name: "Deposit Account", type: "ASSET", normalBalance: "DEBIT", subType: "Bank" },
    { code: "1220", name: "Petty Cash", type: "ASSET", normalBalance: "DEBIT", subType: "Bank" },
    { code: "1230", name: "Credit Card Account", type: "ASSET", normalBalance: "DEBIT", subType: "Bank", description: "Typically a liability but placed here for bank reconciliation" },
    { code: "1300", name: "Stock", type: "ASSET", normalBalance: "DEBIT", subType: "Current Assets" },
    { code: "1310", name: "Work in Progress", type: "ASSET", normalBalance: "DEBIT", subType: "Current Assets" },
    { code: "1400", name: "VAT Input (Purchases)", type: "ASSET", normalBalance: "DEBIT", subType: "Current Assets", isSystemAccount: true },

    // --- LIABILITIES (2000–2700) ---
    { code: "2100", name: "Trade Creditors", type: "LIABILITY", normalBalance: "CREDIT", subType: "Current Liabilities", isSystemAccount: true, description: "Purchase ledger control" },
    { code: "2101", name: "Other Creditors", type: "LIABILITY", normalBalance: "CREDIT", subType: "Current Liabilities" },
    { code: "2102", name: "Accruals", type: "LIABILITY", normalBalance: "CREDIT", subType: "Current Liabilities" },
    { code: "2103", name: "Deferred Income", type: "LIABILITY", normalBalance: "CREDIT", subType: "Current Liabilities" },
    { code: "2200", name: "VAT Output (Sales)", type: "LIABILITY", normalBalance: "CREDIT", subType: "Current Liabilities", isSystemAccount: true },
    { code: "2201", name: "VAT Liability", type: "LIABILITY", normalBalance: "CREDIT", subType: "Current Liabilities", isSystemAccount: true, description: "Net VAT payable to HMRC" },
    { code: "2300", name: "PAYE/NI Liability", type: "LIABILITY", normalBalance: "CREDIT", subType: "Current Liabilities" },
    { code: "2301", name: "Pension Liability", type: "LIABILITY", normalBalance: "CREDIT", subType: "Current Liabilities" },
    { code: "2302", name: "CIS Deductions Payable", type: "LIABILITY", normalBalance: "CREDIT", subType: "Current Liabilities", description: "Construction Industry Scheme deductions to HMRC" },
    { code: "2400", name: "Retention Held", type: "LIABILITY", normalBalance: "CREDIT", subType: "Current Liabilities", description: "Retention held on construction contracts" },
    { code: "2500", name: "Corporation Tax", type: "LIABILITY", normalBalance: "CREDIT", subType: "Current Liabilities" },
    { code: "2600", name: "Bank Loan", type: "LIABILITY", normalBalance: "CREDIT", subType: "Long-term Liabilities" },
    { code: "2700", name: "HP/Finance Lease", type: "LIABILITY", normalBalance: "CREDIT", subType: "Long-term Liabilities" },

    // --- EQUITY (3000–3200) ---
    { code: "3000", name: "Ordinary Shares", type: "EQUITY", normalBalance: "CREDIT", subType: "Capital" },
    { code: "3100", name: "Retained Earnings", type: "EQUITY", normalBalance: "CREDIT", subType: "Reserves", isSystemAccount: true, description: "Accumulated profits brought forward" },
    { code: "3200", name: "Dividends Paid", type: "EQUITY", normalBalance: "DEBIT", subType: "Distributions" },

    // --- REVENUE (4000–4100) ---
    { code: "4000", name: "Sales — Construction", type: "REVENUE", normalBalance: "CREDIT", subType: "Turnover", description: "Revenue from construction projects" },
    { code: "4010", name: "Sales — Service", type: "REVENUE", normalBalance: "CREDIT", subType: "Turnover", description: "Revenue from service contracts" },
    { code: "4020", name: "Sales — Products", type: "REVENUE", normalBalance: "CREDIT", subType: "Turnover" },
    { code: "4100", name: "Other Income", type: "REVENUE", normalBalance: "CREDIT", subType: "Other Income" },

    // --- EXPENSES (5000–6900) ---
    { code: "5000", name: "Materials Purchased", type: "EXPENSE", normalBalance: "DEBIT", subType: "Direct Costs" },
    { code: "5010", name: "Subcontractor Costs", type: "EXPENSE", normalBalance: "DEBIT", subType: "Direct Costs" },
    { code: "5020", name: "Direct Labour", type: "EXPENSE", normalBalance: "DEBIT", subType: "Direct Costs" },
    { code: "5030", name: "Plant Hire", type: "EXPENSE", normalBalance: "DEBIT", subType: "Direct Costs" },
    { code: "5040", name: "Skip / Waste Disposal", type: "EXPENSE", normalBalance: "DEBIT", subType: "Direct Costs" },
    { code: "6000", name: "Rent and Rates", type: "EXPENSE", normalBalance: "DEBIT", subType: "Overheads" },
    { code: "6010", name: "Electricity", type: "EXPENSE", normalBalance: "DEBIT", subType: "Overheads" },
    { code: "6011", name: "Gas", type: "EXPENSE", normalBalance: "DEBIT", subType: "Overheads" },
    { code: "6012", name: "Water", type: "EXPENSE", normalBalance: "DEBIT", subType: "Overheads" },
    { code: "6100", name: "Insurance", type: "EXPENSE", normalBalance: "DEBIT", subType: "Overheads" },
    { code: "6200", name: "Repairs and Maintenance", type: "EXPENSE", normalBalance: "DEBIT", subType: "Overheads" },
    { code: "6300", name: "Motor Expenses", type: "EXPENSE", normalBalance: "DEBIT", subType: "Overheads" },
    { code: "6310", name: "Fuel Costs", type: "EXPENSE", normalBalance: "DEBIT", subType: "Overheads" },
    { code: "6400", name: "Travel and Subsistence", type: "EXPENSE", normalBalance: "DEBIT", subType: "Overheads" },
    { code: "6500", name: "Printing and Stationery", type: "EXPENSE", normalBalance: "DEBIT", subType: "Overheads" },
    { code: "6510", name: "Telephone and Internet", type: "EXPENSE", normalBalance: "DEBIT", subType: "Overheads" },
    { code: "6520", name: "Computer Software/Licences", type: "EXPENSE", normalBalance: "DEBIT", subType: "Overheads" },
    { code: "6600", name: "Legal and Professional Fees", type: "EXPENSE", normalBalance: "DEBIT", subType: "Overheads" },
    { code: "6700", name: "Accountancy Fees", type: "EXPENSE", normalBalance: "DEBIT", subType: "Overheads" },
    { code: "6800", name: "Bank Charges", type: "EXPENSE", normalBalance: "DEBIT", subType: "Overheads" },
    { code: "6810", name: "Interest Paid", type: "EXPENSE", normalBalance: "DEBIT", subType: "Overheads" },
    { code: "6900", name: "Depreciation", type: "EXPENSE", normalBalance: "DEBIT", subType: "Overheads", isSystemAccount: true },

    // --- FINANCE COSTS (8000–8200) ---
    { code: "8000", name: "Bad Debts Written Off", type: "EXPENSE", normalBalance: "DEBIT", subType: "Finance Costs" },
    { code: "8100", name: "Exchange Rate Gains/Losses", type: "EXPENSE", normalBalance: "DEBIT", subType: "Finance Costs" },
    { code: "8200", name: "Sundry Expenses", type: "EXPENSE", normalBalance: "DEBIT", subType: "Finance Costs" },

    // --- TAX (9000) ---
    { code: "9000", name: "Corporation Tax Charge", type: "EXPENSE", normalBalance: "DEBIT", subType: "Taxation" },
  ]

  let accountCount = 0
  for (const acc of accounts) {
    const id = `seed_acc_${acc.code}`
    try {
      await client.query(
        `INSERT INTO accounts (id, code, name, type, "normalBalance", "subType", "vatCode", "isSystemAccount", "isActive", description, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4::"AccountType", $5::"BalanceType", $6, $7, $8, true, $9, NOW(), NOW())
         ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name,
           type = EXCLUDED.type,
           "normalBalance" = EXCLUDED."normalBalance",
           "subType" = EXCLUDED."subType",
           description = EXCLUDED.description,
           "updatedAt" = NOW()`,
        [id, acc.code, acc.name, acc.type, acc.normalBalance, acc.subType || null, acc.vatCode || null, acc.isSystemAccount || false, acc.description || null]
      )
      accountCount++
    } catch (e: any) {
      console.error(`  Failed to seed account ${acc.code}: ${e.message}`)
    }
  }
  console.log(`  Seeded ${accountCount} accounts`)

  // ============================================================
  // VAT CODES — UK Standard (HMRC MTD aligned)
  // ============================================================
  console.log("\n--- Seeding VAT Codes ---")

  const vatCodes: {
    code: string
    name: string
    rate: string
    isDefault?: boolean
    hmrcBox?: number
  }[] = [
    { code: "T0", name: "Zero Rated", rate: "0.00", hmrcBox: 6 },
    { code: "T1", name: "Standard Rate 20%", rate: "20.00", isDefault: true, hmrcBox: 6 },
    { code: "T2", name: "Exempt", rate: "0.00", hmrcBox: 8 },
    { code: "T4", name: "EU Sales (Zero Rated)", rate: "0.00", hmrcBox: 8 },
    { code: "T5", name: "Reduced Rate 5%", rate: "5.00", hmrcBox: 6 },
    { code: "T7", name: "Zero Rated Purchases", rate: "0.00", hmrcBox: 7 },
    { code: "T8", name: "Standard Rate Purchases 20%", rate: "20.00", hmrcBox: 7 },
    { code: "T9", name: "Non-VAT / Outside Scope", rate: "0.00" },
  ]

  let vatCount = 0
  for (const vat of vatCodes) {
    const id = `seed_vat_${vat.code.toLowerCase()}`
    try {
      await client.query(
        `INSERT INTO vat_codes (id, code, name, rate, "isDefault", "isActive", "hmrcBox", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, true, $6, NOW(), NOW())
         ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name,
           rate = EXCLUDED.rate,
           "isDefault" = EXCLUDED."isDefault",
           "hmrcBox" = EXCLUDED."hmrcBox",
           "updatedAt" = NOW()`,
        [id, vat.code, vat.name, vat.rate, vat.isDefault || false, vat.hmrcBox || null]
      )
      vatCount++
    } catch (e: any) {
      console.error(`  Failed to seed VAT code ${vat.code}: ${e.message}`)
    }
  }
  console.log(`  Seeded ${vatCount} VAT codes`)

  // ============================================================
  // ACCOUNTING PERIODS — April 2025 to March 2026 (UK tax year)
  // ============================================================
  console.log("\n--- Seeding Accounting Periods ---")

  const periods: {
    name: string
    startDate: string
    endDate: string
    yearEnd: boolean
  }[] = [
    { name: "April 2025", startDate: "2025-04-01", endDate: "2025-04-30", yearEnd: false },
    { name: "May 2025", startDate: "2025-05-01", endDate: "2025-05-31", yearEnd: false },
    { name: "June 2025", startDate: "2025-06-01", endDate: "2025-06-30", yearEnd: false },
    { name: "July 2025", startDate: "2025-07-01", endDate: "2025-07-31", yearEnd: false },
    { name: "August 2025", startDate: "2025-08-01", endDate: "2025-08-31", yearEnd: false },
    { name: "September 2025", startDate: "2025-09-01", endDate: "2025-09-30", yearEnd: false },
    { name: "October 2025", startDate: "2025-10-01", endDate: "2025-10-31", yearEnd: false },
    { name: "November 2025", startDate: "2025-11-01", endDate: "2025-11-30", yearEnd: false },
    { name: "December 2025", startDate: "2025-12-01", endDate: "2025-12-31", yearEnd: false },
    { name: "January 2026", startDate: "2026-01-01", endDate: "2026-01-31", yearEnd: false },
    { name: "February 2026", startDate: "2026-02-01", endDate: "2026-02-28", yearEnd: false },
    { name: "March 2026", startDate: "2026-03-01", endDate: "2026-03-31", yearEnd: true },
  ]

  let periodCount = 0
  for (const period of periods) {
    const id = `seed_period_${period.startDate.substring(0, 7)}`
    try {
      await client.query(
        `INSERT INTO accounting_periods (id, name, "startDate", "endDate", "yearEnd", status, "createdAt")
         VALUES ($1, $2, $3, $4, $5, 'OPEN', NOW())
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           "startDate" = EXCLUDED."startDate",
           "endDate" = EXCLUDED."endDate",
           "yearEnd" = EXCLUDED."yearEnd"`,
        [id, period.name, period.startDate, period.endDate, period.yearEnd]
      )
      periodCount++
    } catch (e: any) {
      console.error(`  Failed to seed period ${period.name}: ${e.message}`)
    }
  }
  console.log(`  Seeded ${periodCount} accounting periods`)

  // ============================================================
  // SEQUENCE COUNTERS — Auto-numbering for finance documents
  // ============================================================
  console.log("\n--- Seeding Sequence Counters ---")

  const sequences: {
    name: string
    prefix: string
    padding: number
  }[] = [
    { name: "journal", prefix: "JNL-", padding: 6 },
    { name: "sales_invoice", prefix: "INV-", padding: 6 },
    { name: "purchase_invoice", prefix: "PIN-", padding: 6 },
    { name: "purchase_order", prefix: "PO-", padding: 6 },
    { name: "credit_note", prefix: "CN-", padding: 6 },
    { name: "customer", prefix: "CUST-", padding: 6 },
    { name: "supplier", prefix: "SUPP-", padding: 6 },
    { name: "fixed_asset", prefix: "FA-", padding: 6 },
    { name: "quote", prefix: "QT-", padding: 6 },
    { name: "sales_order", prefix: "SO-", padding: 6 },
  ]

  let seqCount = 0
  for (const seq of sequences) {
    const id = `seed_seq_${seq.name}`
    try {
      await client.query(
        `INSERT INTO sequence_counters (id, name, current, prefix, padding)
         VALUES ($1, $2, 0, $3, $4)
         ON CONFLICT (name) DO NOTHING`,
        [id, seq.name, seq.prefix, seq.padding]
      )
      seqCount++
    } catch (e: any) {
      console.error(`  Failed to seed sequence ${seq.name}: ${e.message}`)
    }
  }
  console.log(`  Seeded ${seqCount} sequence counters`)

  // ============================================================
  // VERIFICATION
  // ============================================================
  console.log("\n--- Verification ---")

  const verifications = [
    { label: "Accounts", query: "SELECT COUNT(*) as count FROM accounts" },
    { label: "VAT Codes", query: "SELECT COUNT(*) as count FROM vat_codes" },
    { label: "Accounting Periods", query: "SELECT COUNT(*) as count FROM accounting_periods" },
    { label: "Sequence Counters", query: "SELECT COUNT(*) as count FROM sequence_counters" },
  ]

  for (const v of verifications) {
    const result = await client.query(v.query)
    console.log(`  ${v.label}: ${result.rows[0].count} rows`)
  }

  // Show a sample of the chart of accounts
  console.log("\n--- Sample: Chart of Accounts (first 10) ---")
  const sampleAccounts = await client.query(
    `SELECT code, name, type, "normalBalance", "subType" FROM accounts ORDER BY code LIMIT 10`
  )
  console.table(sampleAccounts.rows)

  // Show VAT codes
  console.log("\n--- VAT Codes ---")
  const allVatCodes = await client.query(
    `SELECT code, name, rate, "isDefault", "hmrcBox" FROM vat_codes ORDER BY code`
  )
  console.table(allVatCodes.rows)

  await client.end()
  console.log("\nFinance seed data completed successfully!")
}

main().catch((e) => {
  console.error("Seed failed:", e)
  process.exit(1)
})
