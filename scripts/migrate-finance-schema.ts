/**
 * Finance Module Schema Migration
 * Adds all finance tables and extends existing models with accounting fields.
 * Safe to run multiple times (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
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
  // STEP 1: Add new enum types
  // ============================================================
  console.log("\n--- Creating enum types ---")

  const enums: [string, string[]][] = [
    ["AccountType", ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]],
    ["BalanceType", ["DEBIT", "CREDIT"]],
    ["JournalSource", ["MANUAL", "SALES_INVOICE", "PURCHASE_INVOICE", "CREDIT_NOTE", "BANK_RECEIPT", "BANK_PAYMENT", "BANK_TRANSFER", "CONSTRUCTION_APPLICATION", "CONSTRUCTION_RETENTION", "CONSTRUCTION_CIS", "PAYROLL", "VAT_JOURNAL", "YEAR_END", "OPENING_BALANCE", "SYSTEM"]],
    ["JournalStatus", ["JOURNAL_DRAFT", "POSTED", "REVERSED"]],
    ["AccInvoiceStatus", ["ACC_DRAFT", "ACC_APPROVED", "ACC_POSTED", "PARTIALLY_PAID", "ACC_PAID", "ACC_CANCELLED", "ACC_CREDIT_NOTE"]],
    ["PeriodStatus", ["OPEN", "PERIOD_CLOSED", "LOCKED"]],
    ["VatReturnStatus", ["VAT_DRAFT", "CALCULATED", "VAT_APPROVED", "VAT_SUBMITTED", "ACCEPTED", "REJECTED"]],
    ["FinanceContractType", ["FINANCE_NEC", "FINANCE_JCT", "FINANCE_BESPOKE"]],
    ["FinanceContractStatus", ["CONTRACT_DRAFT", "CONTRACT_ACTIVE", "PRACTICAL_COMPLETION", "DEFECTS_LIABILITY", "FINAL_ACCOUNT", "CONTRACT_CLOSED"]],
    ["ContractVariationStatus", ["CV_SUBMITTED", "UNDER_REVIEW", "CV_APPROVED", "CV_REJECTED", "WITHDRAWN"]],
    ["ApplicationStatus", ["APP_DRAFT", "APP_SUBMITTED", "APP_CERTIFIED", "APP_PARTIALLY_PAID", "APP_PAID", "APP_DISPUTED"]],
    ["DepreciationMethod", ["STRAIGHT_LINE", "REDUCING_BALANCE", "DEP_NONE"]],
    ["AssetStatus", ["ASSET_ACTIVE", "DISPOSED", "FULLY_DEPRECIATED", "WRITTEN_OFF"]],
    ["RecurrenceFrequency", ["WEEKLY", "FORTNIGHTLY", "REC_MONTHLY", "REC_QUARTERLY", "ANNUALLY"]],
    ["RecurringStatus", ["REC_ACTIVE", "REC_PAUSED", "REC_EXPIRED"]],
    ["ChasingAction", ["REMINDER_1", "REMINDER_2", "REMINDER_3", "FINAL_DEMAND", "PHONE_CALL", "ACCOUNT_ON_HOLD", "LEGAL_ACTION", "WRITE_OFF"]],
    ["BankRuleMatchType", ["CONTAINS", "EXACT", "STARTS_WITH", "REGEX"]],
    ["PrepaymentType", ["PREPAYMENT", "ACCRUAL"]],
    ["PrepaymentStatus", ["PREP_ACTIVE", "FULLY_RELEASED", "PREP_CANCELLED"]],
    ["FinanceImportStatus", ["IMPORT_PENDING", "IMPORT_VALIDATING", "IMPORT_VALIDATED", "IMPORT_IMPORTING", "IMPORT_COMPLETED", "IMPORT_FAILED"]],
  ]

  for (const [name, values] of enums) {
    try {
      await client.query(`CREATE TYPE "${name}" AS ENUM (${values.map(v => `'${v}'`).join(", ")})`)
      console.log(`  Created enum: ${name}`)
    } catch (e: any) {
      if (e.code === "42710") {
        console.log(`  Enum ${name} already exists, skipping`)
      } else throw e
    }
  }

  // Add APPROVED to POStatus
  try {
    await client.query(`ALTER TYPE "POStatus" ADD VALUE IF NOT EXISTS 'APPROVED' BEFORE 'SENT'`)
    console.log("  Added APPROVED to POStatus")
  } catch (e: any) {
    console.log(`  POStatus APPROVED: ${e.message}`)
  }

  // ============================================================
  // STEP 2: Extend existing tables with finance columns
  // ============================================================
  console.log("\n--- Extending existing tables ---")

  // Customer extensions
  const customerColumns = [
    `ADD COLUMN IF NOT EXISTS "accountCode" TEXT UNIQUE`,
    `ADD COLUMN IF NOT EXISTS "vatNumber" TEXT`,
    `ADD COLUMN IF NOT EXISTS "creditLimit" DECIMAL(12,2)`,
    `ADD COLUMN IF NOT EXISTS "paymentTermsDays" INTEGER NOT NULL DEFAULT 30`,
    `ADD COLUMN IF NOT EXISTS "addressLine1" TEXT`,
    `ADD COLUMN IF NOT EXISTS "addressLine2" TEXT`,
    `ADD COLUMN IF NOT EXISTS "city" TEXT`,
    `ADD COLUMN IF NOT EXISTS "county" TEXT`,
    `ADD COLUMN IF NOT EXISTS "postcode" TEXT`,
    `ADD COLUMN IF NOT EXISTS "country" TEXT DEFAULT 'United Kingdom'`,
    `ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true`,
  ]
  for (const col of customerColumns) {
    await client.query(`ALTER TABLE "customers" ${col}`)
  }
  console.log("  Extended customers table")

  // Supplier extensions
  const supplierColumns = [
    `ADD COLUMN IF NOT EXISTS "accountCode" TEXT UNIQUE`,
    `ADD COLUMN IF NOT EXISTS "vatNumber" TEXT`,
    `ADD COLUMN IF NOT EXISTS "paymentTermsDays" INTEGER NOT NULL DEFAULT 30`,
    `ADD COLUMN IF NOT EXISTS "addressLine1" TEXT`,
    `ADD COLUMN IF NOT EXISTS "addressLine2" TEXT`,
    `ADD COLUMN IF NOT EXISTS "city" TEXT`,
    `ADD COLUMN IF NOT EXISTS "county" TEXT`,
    `ADD COLUMN IF NOT EXISTS "postcode" TEXT`,
    `ADD COLUMN IF NOT EXISTS "country" TEXT DEFAULT 'United Kingdom'`,
    `ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true`,
  ]
  for (const col of supplierColumns) {
    await client.query(`ALTER TABLE "suppliers" ${col}`)
  }
  console.log("  Extended suppliers table")

  // PurchaseOrder extensions
  const poColumns = [
    `ADD COLUMN IF NOT EXISTS "subtotal" DECIMAL(12,2)`,
    `ADD COLUMN IF NOT EXISTS "vatAmount" DECIMAL(12,2)`,
    `ADD COLUMN IF NOT EXISTS "createdById" TEXT`,
    `ADD COLUMN IF NOT EXISTS "approvedById" TEXT`,
    `ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3)`,
    `ADD COLUMN IF NOT EXISTS "deliveryAddress" TEXT`,
    `ADD COLUMN IF NOT EXISTS "journalEntryId" TEXT`,
  ]
  for (const col of poColumns) {
    await client.query(`ALTER TABLE "purchase_orders" ${col}`)
  }
  console.log("  Extended purchase_orders table")

  // PurchaseOrderLine extensions
  const polColumns = [
    `ADD COLUMN IF NOT EXISTS "vatCodeId" TEXT`,
    `ADD COLUMN IF NOT EXISTS "vatAmount" DECIMAL(12,2)`,
    `ADD COLUMN IF NOT EXISTS "accountId" TEXT`,
    `ADD COLUMN IF NOT EXISTS "netAmount" DECIMAL(12,2)`,
  ]
  for (const col of polColumns) {
    await client.query(`ALTER TABLE "purchase_order_lines" ${col}`)
  }
  console.log("  Extended purchase_order_lines table")

  // SalesInvoice extensions — make projectId optional first
  await client.query(`ALTER TABLE "sales_invoices" ALTER COLUMN "projectId" DROP NOT NULL`)
  const siColumns = [
    `ADD COLUMN IF NOT EXISTS "customerId" TEXT`,
    `ADD COLUMN IF NOT EXISTS "subtotal" DECIMAL(12,2)`,
    `ADD COLUMN IF NOT EXISTS "vatAmount" DECIMAL(12,2)`,
    `ADD COLUMN IF NOT EXISTS "total" DECIMAL(12,2)`,
    `ADD COLUMN IF NOT EXISTS "isCreditNote" BOOLEAN NOT NULL DEFAULT false`,
    `ADD COLUMN IF NOT EXISTS "relatedInvoiceId" TEXT`,
    `ADD COLUMN IF NOT EXISTS "journalEntryId" TEXT`,
    `ADD COLUMN IF NOT EXISTS "createdBy" TEXT`,
  ]
  for (const col of siColumns) {
    await client.query(`ALTER TABLE "sales_invoices" ${col}`)
  }
  console.log("  Extended sales_invoices table (projectId now optional)")

  // ============================================================
  // STEP 3: Create new finance tables
  // ============================================================
  console.log("\n--- Creating new tables ---")

  // Accounts (Chart of Accounts)
  await client.query(`
    CREATE TABLE IF NOT EXISTS "accounts" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "code" TEXT NOT NULL UNIQUE,
      "name" TEXT NOT NULL,
      "type" "AccountType" NOT NULL,
      "subType" TEXT,
      "parentId" TEXT REFERENCES "accounts"("id"),
      "vatCode" TEXT,
      "isSystemAccount" BOOLEAN NOT NULL DEFAULT false,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "normalBalance" "BalanceType" NOT NULL,
      "description" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await client.query(`CREATE INDEX IF NOT EXISTS "accounts_type_idx" ON "accounts"("type")`)
  await client.query(`CREATE INDEX IF NOT EXISTS "accounts_code_idx" ON "accounts"("code")`)
  console.log("  Created accounts table")

  // Accounting Periods
  await client.query(`
    CREATE TABLE IF NOT EXISTS "accounting_periods" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "name" TEXT NOT NULL,
      "startDate" TIMESTAMP(3) NOT NULL,
      "endDate" TIMESTAMP(3) NOT NULL,
      "yearEnd" BOOLEAN NOT NULL DEFAULT false,
      "status" "PeriodStatus" NOT NULL DEFAULT 'OPEN',
      "closedBy" TEXT,
      "closedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await client.query(`CREATE INDEX IF NOT EXISTS "ap_dates_idx" ON "accounting_periods"("startDate", "endDate")`)
  await client.query(`CREATE INDEX IF NOT EXISTS "ap_status_idx" ON "accounting_periods"("status")`)
  console.log("  Created accounting_periods table")

  // VAT Codes
  await client.query(`
    CREATE TABLE IF NOT EXISTS "vat_codes" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "code" TEXT NOT NULL UNIQUE,
      "name" TEXT NOT NULL,
      "rate" DECIMAL(5,2) NOT NULL,
      "isDefault" BOOLEAN NOT NULL DEFAULT false,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "hmrcBox" INTEGER,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  console.log("  Created vat_codes table")

  // Journal Entries
  await client.query(`
    CREATE TABLE IF NOT EXISTS "journal_entries" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "entryNumber" TEXT NOT NULL UNIQUE,
      "date" TIMESTAMP(3) NOT NULL,
      "postingDate" TIMESTAMP(3),
      "periodId" TEXT NOT NULL REFERENCES "accounting_periods"("id"),
      "description" TEXT NOT NULL,
      "reference" TEXT,
      "source" "JournalSource" NOT NULL DEFAULT 'MANUAL',
      "sourceId" TEXT,
      "reversalOf" TEXT,
      "reversedBy" TEXT,
      "status" "JournalStatus" NOT NULL DEFAULT 'JOURNAL_DRAFT',
      "totalDebit" DECIMAL(12,2) NOT NULL,
      "totalCredit" DECIMAL(12,2) NOT NULL,
      "createdBy" TEXT NOT NULL,
      "approvedBy" TEXT,
      "postedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await client.query(`CREATE INDEX IF NOT EXISTS "je_date_idx" ON "journal_entries"("date")`)
  await client.query(`CREATE INDEX IF NOT EXISTS "je_status_idx" ON "journal_entries"("status")`)
  await client.query(`CREATE INDEX IF NOT EXISTS "je_period_idx" ON "journal_entries"("periodId")`)
  await client.query(`CREATE INDEX IF NOT EXISTS "je_source_idx" ON "journal_entries"("source")`)
  await client.query(`CREATE INDEX IF NOT EXISTS "je_number_idx" ON "journal_entries"("entryNumber")`)
  console.log("  Created journal_entries table")

  // Journal Lines
  await client.query(`
    CREATE TABLE IF NOT EXISTS "journal_lines" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "journalId" TEXT NOT NULL REFERENCES "journal_entries"("id") ON DELETE CASCADE,
      "accountId" TEXT NOT NULL REFERENCES "accounts"("id"),
      "description" TEXT,
      "debit" DECIMAL(12,2) NOT NULL DEFAULT 0,
      "credit" DECIMAL(12,2) NOT NULL DEFAULT 0,
      "vatCodeId" TEXT REFERENCES "vat_codes"("id"),
      "vatAmount" DECIMAL(12,2),
      "projectId" TEXT,
      "costCentreId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await client.query(`CREATE INDEX IF NOT EXISTS "jl_journal_idx" ON "journal_lines"("journalId")`)
  await client.query(`CREATE INDEX IF NOT EXISTS "jl_account_idx" ON "journal_lines"("accountId")`)
  console.log("  Created journal_lines table")

  // Sales Invoice Lines
  await client.query(`
    CREATE TABLE IF NOT EXISTS "sales_invoice_lines" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "invoiceId" TEXT NOT NULL REFERENCES "sales_invoices"("id") ON DELETE CASCADE,
      "description" TEXT NOT NULL,
      "quantity" DECIMAL(10,3) NOT NULL,
      "unitPrice" DECIMAL(12,2) NOT NULL,
      "netAmount" DECIMAL(12,2) NOT NULL,
      "vatCodeId" TEXT,
      "vatAmount" DECIMAL(12,2),
      "accountId" TEXT,
      "projectId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await client.query(`CREATE INDEX IF NOT EXISTS "sil_invoice_idx" ON "sales_invoice_lines"("invoiceId")`)
  console.log("  Created sales_invoice_lines table")

  // Purchase Invoices
  await client.query(`
    CREATE TABLE IF NOT EXISTS "purchase_invoices" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "invoiceNumber" TEXT NOT NULL,
      "supplierId" TEXT NOT NULL REFERENCES "suppliers"("id"),
      "projectId" TEXT,
      "invoiceDate" TIMESTAMP(3) NOT NULL,
      "dueDate" TIMESTAMP(3) NOT NULL,
      "subtotal" DECIMAL(12,2) NOT NULL,
      "vatAmount" DECIMAL(12,2) NOT NULL,
      "total" DECIMAL(12,2) NOT NULL,
      "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
      "status" "AccInvoiceStatus" NOT NULL DEFAULT 'ACC_DRAFT',
      "isCreditNote" BOOLEAN NOT NULL DEFAULT false,
      "relatedInvoiceId" TEXT,
      "notes" TEXT,
      "journalEntryId" TEXT,
      "createdBy" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await client.query(`CREATE INDEX IF NOT EXISTS "pi_supplier_idx" ON "purchase_invoices"("supplierId")`)
  await client.query(`CREATE INDEX IF NOT EXISTS "pi_status_idx" ON "purchase_invoices"("status")`)
  console.log("  Created purchase_invoices table")

  // Purchase Invoice Lines
  await client.query(`
    CREATE TABLE IF NOT EXISTS "purchase_invoice_lines" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "invoiceId" TEXT NOT NULL REFERENCES "purchase_invoices"("id") ON DELETE CASCADE,
      "description" TEXT NOT NULL,
      "quantity" DECIMAL(10,3) NOT NULL,
      "unitPrice" DECIMAL(12,2) NOT NULL,
      "netAmount" DECIMAL(12,2) NOT NULL,
      "vatCodeId" TEXT,
      "vatAmount" DECIMAL(12,2),
      "accountId" TEXT,
      "projectId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await client.query(`CREATE INDEX IF NOT EXISTS "pil_invoice_idx" ON "purchase_invoice_lines"("invoiceId")`)
  console.log("  Created purchase_invoice_lines table")

  // Bank Accounts
  await client.query(`
    CREATE TABLE IF NOT EXISTS "bank_accounts" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "name" TEXT NOT NULL,
      "accountNumber" TEXT NOT NULL,
      "sortCode" TEXT NOT NULL,
      "accountId" TEXT NOT NULL,
      "currency" TEXT NOT NULL DEFAULT 'GBP',
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "currentBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  console.log("  Created bank_accounts table")

  // Bank Transactions
  await client.query(`
    CREATE TABLE IF NOT EXISTS "bank_transactions" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "bankAccountId" TEXT NOT NULL REFERENCES "bank_accounts"("id"),
      "date" TIMESTAMP(3) NOT NULL,
      "description" TEXT NOT NULL,
      "reference" TEXT,
      "amount" DECIMAL(12,2) NOT NULL,
      "balance" DECIMAL(12,2),
      "isReconciled" BOOLEAN NOT NULL DEFAULT false,
      "reconciledAt" TIMESTAMP(3),
      "journalEntryId" TEXT,
      "source" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await client.query(`CREATE INDEX IF NOT EXISTS "bt_bank_idx" ON "bank_transactions"("bankAccountId")`)
  await client.query(`CREATE INDEX IF NOT EXISTS "bt_date_idx" ON "bank_transactions"("date")`)
  console.log("  Created bank_transactions table")

  // Payment Allocations
  await client.query(`
    CREATE TABLE IF NOT EXISTS "payment_allocations" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "bankTransactionId" TEXT REFERENCES "bank_transactions"("id"),
      "salesInvoiceId" TEXT REFERENCES "sales_invoices"("id"),
      "purchaseInvoiceId" TEXT REFERENCES "purchase_invoices"("id"),
      "amount" DECIMAL(12,2) NOT NULL,
      "date" TIMESTAMP(3) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  console.log("  Created payment_allocations table")

  // VAT Returns
  await client.query(`
    CREATE TABLE IF NOT EXISTS "vat_returns" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "periodId" TEXT NOT NULL REFERENCES "accounting_periods"("id"),
      "periodStart" TIMESTAMP(3) NOT NULL,
      "periodEnd" TIMESTAMP(3) NOT NULL,
      "box1" DECIMAL(12,2) NOT NULL,
      "box2" DECIMAL(12,2) NOT NULL,
      "box3" DECIMAL(12,2) NOT NULL,
      "box4" DECIMAL(12,2) NOT NULL,
      "box5" DECIMAL(12,2) NOT NULL,
      "box6" DECIMAL(12,2) NOT NULL,
      "box7" DECIMAL(12,2) NOT NULL,
      "box8" DECIMAL(12,2) NOT NULL,
      "box9" DECIMAL(12,2) NOT NULL,
      "status" "VatReturnStatus" NOT NULL DEFAULT 'VAT_DRAFT',
      "submittedAt" TIMESTAMP(3),
      "hmrcCorrelationId" TEXT,
      "hmrcReceiptId" TEXT,
      "submittedBy" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  console.log("  Created vat_returns table")

  // Construction Contracts
  await client.query(`
    CREATE TABLE IF NOT EXISTS "construction_contracts" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "projectId" TEXT NOT NULL,
      "contractRef" TEXT NOT NULL UNIQUE,
      "contractType" "FinanceContractType" NOT NULL,
      "clientId" TEXT NOT NULL,
      "clientName" TEXT,
      "originalValue" DECIMAL(12,2) NOT NULL,
      "currentValue" DECIMAL(12,2) NOT NULL,
      "retentionPercent" DECIMAL(5,2) NOT NULL,
      "retentionLimit" DECIMAL(12,2),
      "defectsLiabilityMonths" INTEGER NOT NULL DEFAULT 12,
      "cisApplicable" BOOLEAN NOT NULL DEFAULT false,
      "cisRate" DECIMAL(5,2),
      "status" "FinanceContractStatus" NOT NULL DEFAULT 'CONTRACT_DRAFT',
      "practicalCompletionDate" TIMESTAMP(3),
      "finalAccountAgreed" BOOLEAN NOT NULL DEFAULT false,
      "description" TEXT,
      "createdBy" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await client.query(`CREATE INDEX IF NOT EXISTS "cc_client_idx" ON "construction_contracts"("clientId")`)
  await client.query(`CREATE INDEX IF NOT EXISTS "cc_project_idx" ON "construction_contracts"("projectId")`)
  await client.query(`CREATE INDEX IF NOT EXISTS "cc_status_idx" ON "construction_contracts"("status")`)
  console.log("  Created construction_contracts table")

  // Contract Variations
  await client.query(`
    CREATE TABLE IF NOT EXISTS "contract_variations" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "contractId" TEXT NOT NULL REFERENCES "construction_contracts"("id") ON DELETE CASCADE,
      "variationRef" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "value" DECIMAL(12,2) NOT NULL,
      "status" "ContractVariationStatus" NOT NULL DEFAULT 'CV_SUBMITTED',
      "submittedDate" TIMESTAMP(3) NOT NULL,
      "approvedDate" TIMESTAMP(3),
      "approvedValue" DECIMAL(12,2),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await client.query(`CREATE INDEX IF NOT EXISTS "cv_contract_idx" ON "contract_variations"("contractId")`)
  console.log("  Created contract_variations table")

  // Applications for Payment
  await client.query(`
    CREATE TABLE IF NOT EXISTS "applications_for_payment" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "contractId" TEXT NOT NULL REFERENCES "construction_contracts"("id") ON DELETE CASCADE,
      "applicationNumber" INTEGER NOT NULL,
      "periodStart" TIMESTAMP(3) NOT NULL,
      "periodEnd" TIMESTAMP(3) NOT NULL,
      "cumulativeWorksComplete" DECIMAL(12,2) NOT NULL,
      "cumulativeMaterialsOnSite" DECIMAL(12,2) NOT NULL,
      "cumulativeVariations" DECIMAL(12,2) NOT NULL,
      "grossCumulativeValue" DECIMAL(12,2) NOT NULL,
      "thisApplicationGross" DECIMAL(12,2) NOT NULL,
      "retentionHeld" DECIMAL(12,2) NOT NULL,
      "retentionRelease" DECIMAL(12,2) NOT NULL DEFAULT 0,
      "cisDeduction" DECIMAL(12,2) NOT NULL DEFAULT 0,
      "contraCharges" DECIMAL(12,2) NOT NULL DEFAULT 0,
      "contraDescription" TEXT,
      "appliedAmount" DECIMAL(12,2) NOT NULL,
      "certifiedAmount" DECIMAL(12,2),
      "certificateRef" TEXT,
      "certificateDate" TIMESTAMP(3),
      "vatAmount" DECIMAL(12,2),
      "vatCodeId" TEXT,
      "paymentDueDate" TIMESTAMP(3),
      "paymentReceivedDate" TIMESTAMP(3),
      "paymentReceivedAmount" DECIMAL(12,2),
      "status" "ApplicationStatus" NOT NULL DEFAULT 'APP_DRAFT',
      "journalEntryId" TEXT,
      "cisJournalEntryId" TEXT,
      "createdBy" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("contractId", "applicationNumber")
    )
  `)
  await client.query(`CREATE INDEX IF NOT EXISTS "afp_contract_idx" ON "applications_for_payment"("contractId")`)
  await client.query(`CREATE INDEX IF NOT EXISTS "afp_status_idx" ON "applications_for_payment"("status")`)
  console.log("  Created applications_for_payment table")

  // Application Lines
  await client.query(`
    CREATE TABLE IF NOT EXISTS "application_lines" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "applicationId" TEXT NOT NULL REFERENCES "applications_for_payment"("id") ON DELETE CASCADE,
      "description" TEXT NOT NULL,
      "contractLineRef" TEXT,
      "cumulativeValue" DECIMAL(12,2) NOT NULL,
      "previousValue" DECIMAL(12,2) NOT NULL,
      "thisPeriodValue" DECIMAL(12,2) NOT NULL,
      "percentComplete" DECIMAL(5,2)
    )
  `)
  await client.query(`CREATE INDEX IF NOT EXISTS "al_app_idx" ON "application_lines"("applicationId")`)
  console.log("  Created application_lines table")

  // Fixed Asset Categories
  await client.query(`
    CREATE TABLE IF NOT EXISTS "fixed_asset_categories" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "name" TEXT NOT NULL UNIQUE,
      "depreciationMethod" "DepreciationMethod" NOT NULL DEFAULT 'STRAIGHT_LINE',
      "depreciationRate" DECIMAL(5,2) NOT NULL,
      "usefulLifeMonths" INTEGER,
      "assetAccountId" TEXT NOT NULL,
      "depreciationAccountId" TEXT NOT NULL,
      "accumulatedDepAccountId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  console.log("  Created fixed_asset_categories table")

  // Fixed Assets
  await client.query(`
    CREATE TABLE IF NOT EXISTS "fixed_assets" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "assetCode" TEXT NOT NULL UNIQUE,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "categoryId" TEXT NOT NULL REFERENCES "fixed_asset_categories"("id"),
      "purchaseDate" TIMESTAMP(3) NOT NULL,
      "purchaseCost" DECIMAL(12,2) NOT NULL,
      "residualValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
      "accumulatedDepreciation" DECIMAL(12,2) NOT NULL DEFAULT 0,
      "netBookValue" DECIMAL(12,2) NOT NULL,
      "serialNumber" TEXT,
      "location" TEXT,
      "supplierId" TEXT,
      "purchaseInvoiceId" TEXT,
      "status" "AssetStatus" NOT NULL DEFAULT 'ASSET_ACTIVE',
      "disposalDate" TIMESTAMP(3),
      "disposalProceeds" DECIMAL(12,2),
      "disposalGainLoss" DECIMAL(12,2),
      "createdBy" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await client.query(`CREATE INDEX IF NOT EXISTS "fa_category_idx" ON "fixed_assets"("categoryId")`)
  await client.query(`CREATE INDEX IF NOT EXISTS "fa_status_idx" ON "fixed_assets"("status")`)
  console.log("  Created fixed_assets table")

  // Depreciation Entries
  await client.query(`
    CREATE TABLE IF NOT EXISTS "depreciation_entries" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "assetId" TEXT NOT NULL REFERENCES "fixed_assets"("id") ON DELETE CASCADE,
      "date" TIMESTAMP(3) NOT NULL,
      "amount" DECIMAL(12,2) NOT NULL,
      "journalEntryId" TEXT,
      "periodId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await client.query(`CREATE INDEX IF NOT EXISTS "de_asset_idx" ON "depreciation_entries"("assetId")`)
  console.log("  Created depreciation_entries table")

  // Recurring Templates
  await client.query(`
    CREATE TABLE IF NOT EXISTS "recurring_templates" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "frequency" "RecurrenceFrequency" NOT NULL,
      "startDate" TIMESTAMP(3) NOT NULL,
      "endDate" TIMESTAMP(3),
      "nextRunDate" TIMESTAMP(3) NOT NULL,
      "lastRunDate" TIMESTAMP(3),
      "totalRuns" INTEGER NOT NULL DEFAULT 0,
      "maxRuns" INTEGER,
      "source" "JournalSource" NOT NULL DEFAULT 'MANUAL',
      "status" "RecurringStatus" NOT NULL DEFAULT 'REC_ACTIVE',
      "createdBy" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  console.log("  Created recurring_templates table")

  // Recurring Template Lines
  await client.query(`
    CREATE TABLE IF NOT EXISTS "recurring_template_lines" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "templateId" TEXT NOT NULL REFERENCES "recurring_templates"("id") ON DELETE CASCADE,
      "accountId" TEXT NOT NULL,
      "description" TEXT,
      "debit" DECIMAL(12,2) NOT NULL DEFAULT 0,
      "credit" DECIMAL(12,2) NOT NULL DEFAULT 0,
      "vatCodeId" TEXT,
      "costCentreId" TEXT,
      "projectId" TEXT
    )
  `)
  await client.query(`CREATE INDEX IF NOT EXISTS "rtl_template_idx" ON "recurring_template_lines"("templateId")`)
  console.log("  Created recurring_template_lines table")

  // Prepayments
  await client.query(`
    CREATE TABLE IF NOT EXISTS "prepayments" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "type" "PrepaymentType" NOT NULL,
      "description" TEXT NOT NULL,
      "sourceAccountId" TEXT NOT NULL,
      "targetAccountId" TEXT NOT NULL,
      "totalAmount" DECIMAL(12,2) NOT NULL,
      "releasedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
      "remainingAmount" DECIMAL(12,2) NOT NULL,
      "startDate" TIMESTAMP(3) NOT NULL,
      "endDate" TIMESTAMP(3) NOT NULL,
      "releaseFrequency" "RecurrenceFrequency" NOT NULL DEFAULT 'REC_MONTHLY',
      "releaseAmount" DECIMAL(12,2) NOT NULL,
      "status" "PrepaymentStatus" NOT NULL DEFAULT 'PREP_ACTIVE',
      "sourceJournalId" TEXT,
      "createdBy" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  console.log("  Created prepayments table")

  // Prepayment Releases
  await client.query(`
    CREATE TABLE IF NOT EXISTS "prepayment_releases" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "prepaymentId" TEXT NOT NULL REFERENCES "prepayments"("id") ON DELETE CASCADE,
      "date" TIMESTAMP(3) NOT NULL,
      "amount" DECIMAL(12,2) NOT NULL,
      "journalEntryId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await client.query(`CREATE INDEX IF NOT EXISTS "pr_prepayment_idx" ON "prepayment_releases"("prepaymentId")`)
  console.log("  Created prepayment_releases table")

  // Credit Control Log
  await client.query(`
    CREATE TABLE IF NOT EXISTS "credit_control_logs" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "customerId" TEXT NOT NULL REFERENCES "customers"("id"),
      "salesInvoiceId" TEXT,
      "action" "ChasingAction" NOT NULL,
      "notes" TEXT,
      "contactedName" TEXT,
      "promisedDate" TIMESTAMP(3),
      "promisedAmount" DECIMAL(12,2),
      "nextFollowUp" TIMESTAMP(3),
      "letterSent" BOOLEAN NOT NULL DEFAULT false,
      "emailSent" BOOLEAN NOT NULL DEFAULT false,
      "createdBy" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await client.query(`CREATE INDEX IF NOT EXISTS "ccl_customer_idx" ON "credit_control_logs"("customerId")`)
  await client.query(`CREATE INDEX IF NOT EXISTS "ccl_invoice_idx" ON "credit_control_logs"("salesInvoiceId")`)
  await client.query(`CREATE INDEX IF NOT EXISTS "ccl_followup_idx" ON "credit_control_logs"("nextFollowUp")`)
  console.log("  Created credit_control_logs table")

  // Bank Rules
  await client.query(`
    CREATE TABLE IF NOT EXISTS "bank_rules" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "name" TEXT NOT NULL,
      "matchField" TEXT NOT NULL DEFAULT 'description',
      "matchType" "BankRuleMatchType" NOT NULL DEFAULT 'CONTAINS',
      "matchValue" TEXT NOT NULL,
      "accountId" TEXT NOT NULL,
      "vatCodeId" TEXT,
      "description" TEXT,
      "isInflow" BOOLEAN,
      "priority" INTEGER NOT NULL DEFAULT 0,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "timesApplied" INTEGER NOT NULL DEFAULT 0,
      "createdBy" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await client.query(`CREATE INDEX IF NOT EXISTS "br_active_idx" ON "bank_rules"("isActive")`)
  console.log("  Created bank_rules table")

  // Cost Centres
  await client.query(`
    CREATE TABLE IF NOT EXISTS "cost_centres" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "code" TEXT NOT NULL UNIQUE,
      "name" TEXT NOT NULL,
      "managerId" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  console.log("  Created cost_centres table")

  // Budget Lines
  await client.query(`
    CREATE TABLE IF NOT EXISTS "budget_lines" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "accountId" TEXT NOT NULL REFERENCES "accounts"("id"),
      "periodStart" TIMESTAMP(3) NOT NULL,
      "periodEnd" TIMESTAMP(3) NOT NULL,
      "amount" DECIMAL(12,2) NOT NULL,
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  console.log("  Created budget_lines table")

  // Accounting Audit Log
  await client.query(`
    CREATE TABLE IF NOT EXISTS "accounting_audit_logs" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "action" TEXT NOT NULL,
      "entityType" TEXT NOT NULL,
      "entityId" TEXT NOT NULL,
      "journalEntryId" TEXT REFERENCES "journal_entries"("id"),
      "userId" TEXT NOT NULL,
      "details" JSONB,
      "ipAddress" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await client.query(`CREATE INDEX IF NOT EXISTS "aal_entity_idx" ON "accounting_audit_logs"("entityType", "entityId")`)
  await client.query(`CREATE INDEX IF NOT EXISTS "aal_user_idx" ON "accounting_audit_logs"("userId")`)
  await client.query(`CREATE INDEX IF NOT EXISTS "aal_created_idx" ON "accounting_audit_logs"("createdAt")`)
  console.log("  Created accounting_audit_logs table")

  // Finance Data Import
  await client.query(`
    CREATE TABLE IF NOT EXISTS "finance_data_imports" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "type" TEXT NOT NULL,
      "filename" TEXT NOT NULL,
      "totalRows" INTEGER NOT NULL DEFAULT 0,
      "validRows" INTEGER NOT NULL DEFAULT 0,
      "errorRows" INTEGER NOT NULL DEFAULT 0,
      "importedRows" INTEGER NOT NULL DEFAULT 0,
      "status" "FinanceImportStatus" NOT NULL DEFAULT 'IMPORT_PENDING',
      "errors" JSONB,
      "mappings" JSONB,
      "createdBy" TEXT NOT NULL,
      "completedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
  console.log("  Created finance_data_imports table")

  // Sequence Counters
  await client.query(`
    CREATE TABLE IF NOT EXISTS "sequence_counters" (
      "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "name" TEXT NOT NULL UNIQUE,
      "current" INTEGER NOT NULL DEFAULT 0,
      "prefix" TEXT NOT NULL DEFAULT '',
      "padding" INTEGER NOT NULL DEFAULT 6
    )
  `)
  console.log("  Created sequence_counters table")

  // ============================================================
  // STEP 4: Add FK constraints for extended models
  // ============================================================
  console.log("\n--- Adding FK constraints ---")

  // PO createdBy/approvedBy FKs
  try {
    await client.query(`ALTER TABLE "purchase_orders" ADD CONSTRAINT "po_createdby_fk" FOREIGN KEY ("createdById") REFERENCES "users"("id")`)
    console.log("  Added PO createdBy FK")
  } catch { console.log("  PO createdBy FK already exists") }

  try {
    await client.query(`ALTER TABLE "purchase_orders" ADD CONSTRAINT "po_approvedby_fk" FOREIGN KEY ("approvedById") REFERENCES "users"("id")`)
    console.log("  Added PO approvedBy FK")
  } catch { console.log("  PO approvedBy FK already exists") }

  // SalesInvoice customerId FK
  try {
    await client.query(`ALTER TABLE "sales_invoices" ADD CONSTRAINT "si_customer_fk" FOREIGN KEY ("customerId") REFERENCES "customers"("id")`)
    console.log("  Added SalesInvoice customer FK")
  } catch { console.log("  SalesInvoice customer FK already exists") }

  // ============================================================
  // VERIFICATION
  // ============================================================
  console.log("\n--- Verification ---")

  const tables = await client.query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN (
      'accounts', 'journal_entries', 'journal_lines', 'vat_codes', 'accounting_periods',
      'sales_invoice_lines', 'purchase_invoices', 'purchase_invoice_lines',
      'bank_accounts', 'bank_transactions', 'payment_allocations', 'vat_returns',
      'construction_contracts', 'contract_variations', 'applications_for_payment', 'application_lines',
      'fixed_asset_categories', 'fixed_assets', 'depreciation_entries',
      'recurring_templates', 'recurring_template_lines', 'prepayments', 'prepayment_releases',
      'credit_control_logs', 'bank_rules', 'cost_centres', 'budget_lines',
      'accounting_audit_logs', 'finance_data_imports', 'sequence_counters'
    )
    ORDER BY tablename
  `)

  console.log(`\n  ${tables.rows.length} finance tables created:`)
  for (const row of tables.rows) {
    console.log(`    - ${row.tablename}`)
  }

  await client.end()
  console.log("\nMigration complete!")
}

main().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})
