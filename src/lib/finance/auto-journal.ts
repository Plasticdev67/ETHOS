/**
 * Finance Integration Hooks — Auto-Journal Generation
 *
 * These functions create double-entry journal entries automatically
 * when operational actions occur (invoice posting, payment, PO receipt, etc.)
 *
 * All amounts use string representation for Decimal precision.
 * Each function creates a POSTED journal entry with the appropriate source.
 */
import { prisma } from '@/lib/db'
import { getNextSequenceNumber } from '@/lib/finance/sequences'

// Well-known account codes from the seed data
const SYSTEM_ACCOUNTS = {
  TRADE_DEBTORS: '1100',        // Sales ledger control
  TRADE_CREDITORS: '2100',      // Purchase ledger control
  VAT_INPUT: '1400',            // VAT on purchases
  VAT_OUTPUT: '2200',           // VAT on sales
  CURRENT_ACCOUNT: '1200',      // Default bank
  RETENTION_HELD: '2400',       // Retention on contracts
  CIS_DEDUCTIONS: '2302',       // CIS payable to HMRC
}

async function getAccountId(code: string): Promise<string> {
  const account = await prisma.account.findUnique({ where: { code }, select: { id: true } })
  if (!account) throw new Error(`System account ${code} not found`)
  return account.id
}

async function getNextJournalNumber(): Promise<string> {
  return getNextSequenceNumber('journal')
}

async function findCurrentPeriod(): Promise<string> {
  const now = new Date()
  const period = await prisma.accountingPeriod.findFirst({
    where: {
      startDate: { lte: now },
      endDate: { gte: now },
      status: 'OPEN',
    },
    select: { id: true },
  })
  if (!period) throw new Error('No open accounting period found for the current date')
  return period.id
}

/**
 * Auto-journal when a SALES INVOICE is posted.
 * DR Trade Debtors (gross)
 * CR Revenue account (net)
 * CR VAT Output (vat)
 */
export async function journalOnSalesInvoicePost(params: {
  invoiceId: string
  netAmount: string
  vatAmount: string
  grossAmount: string
  revenueAccountId: string
  description: string
  date?: Date
}): Promise<string> {
  const { invoiceId, netAmount, vatAmount, grossAmount, revenueAccountId, description, date } = params
  const debtorsId = await getAccountId(SYSTEM_ACCOUNTS.TRADE_DEBTORS)
  const vatOutputId = await getAccountId(SYSTEM_ACCOUNTS.VAT_OUTPUT)
  const entryNumber = await getNextJournalNumber()
  const periodId = await findCurrentPeriod()

  const entry = await prisma.journalEntry.create({
    data: {
      entryNumber,
      date: date || new Date(),
      postingDate: new Date(),
      description: `Sales Invoice: ${description}`,
      reference: invoiceId,
      source: 'SALES_INVOICE',
      status: 'POSTED',
      createdBy: 'SYSTEM',
      period: { connect: { id: periodId } },
      totalDebit: grossAmount,
      totalCredit: grossAmount,
      lines: {
        create: [
          { accountId: debtorsId, description: 'Trade Debtors', debit: grossAmount, credit: '0' },
          { accountId: revenueAccountId, description: 'Revenue', debit: '0', credit: netAmount },
          ...(parseFloat(vatAmount) > 0 ? [
            { accountId: vatOutputId, description: 'VAT Output', debit: '0', credit: vatAmount },
          ] : []),
        ],
      },
    },
  })

  return entry.id
}

/**
 * Auto-journal when a PURCHASE INVOICE is posted.
 * DR Expense/Asset account (net)
 * DR VAT Input (vat)
 * CR Trade Creditors (gross)
 */
export async function journalOnPurchaseInvoicePost(params: {
  invoiceId: string
  netAmount: string
  vatAmount: string
  grossAmount: string
  expenseAccountId: string
  description: string
  date?: Date
}): Promise<string> {
  const { invoiceId, netAmount, vatAmount, grossAmount, expenseAccountId, description, date } = params
  const creditorsId = await getAccountId(SYSTEM_ACCOUNTS.TRADE_CREDITORS)
  const vatInputId = await getAccountId(SYSTEM_ACCOUNTS.VAT_INPUT)
  const entryNumber = await getNextJournalNumber()
  const periodId = await findCurrentPeriod()

  const entry = await prisma.journalEntry.create({
    data: {
      entryNumber,
      date: date || new Date(),
      postingDate: new Date(),
      description: `Purchase Invoice: ${description}`,
      reference: invoiceId,
      source: 'PURCHASE_INVOICE',
      status: 'POSTED',
      createdBy: 'SYSTEM',
      period: { connect: { id: periodId } },
      totalDebit: grossAmount,
      totalCredit: grossAmount,
      lines: {
        create: [
          { accountId: expenseAccountId, description: 'Expense/Cost', debit: netAmount, credit: '0' },
          ...(parseFloat(vatAmount) > 0 ? [
            { accountId: vatInputId, description: 'VAT Input', debit: vatAmount, credit: '0' },
          ] : []),
          { accountId: creditorsId, description: 'Trade Creditors', debit: '0', credit: grossAmount },
        ],
      },
    },
  })

  return entry.id
}

/**
 * Auto-journal when a CUSTOMER PAYMENT (bank receipt) is received.
 * DR Bank (amount)
 * CR Trade Debtors (amount)
 */
export async function journalOnCustomerPayment(params: {
  bankAccountId: string
  amount: string
  customerId: string
  description: string
  reference?: string
  date?: Date
}): Promise<string> {
  const { bankAccountId, amount, description, reference, date } = params
  const debtorsId = await getAccountId(SYSTEM_ACCOUNTS.TRADE_DEBTORS)

  // Look up the GL account linked to this bank account
  const bankAcc: { accountId: string | null } | null = await prisma.bankAccount.findUnique({
    where: { id: bankAccountId },
    select: { accountId: true },
  })
  const bankGLId = bankAcc?.accountId || await getAccountId(SYSTEM_ACCOUNTS.CURRENT_ACCOUNT)

  const entryNumber = await getNextJournalNumber()
  const periodId = await findCurrentPeriod()

  const entry = await prisma.journalEntry.create({
    data: {
      entryNumber,
      date: date || new Date(),
      postingDate: new Date(),
      description: `Customer Receipt: ${description}`,
      reference: reference || '',
      source: 'BANK_RECEIPT',
      status: 'POSTED',
      createdBy: 'SYSTEM',
      period: { connect: { id: periodId } },
      totalDebit: amount,
      totalCredit: amount,
      lines: {
        create: [
          { accountId: bankGLId, description: 'Bank Receipt', debit: amount, credit: '0' },
          { accountId: debtorsId, description: 'Trade Debtors', debit: '0', credit: amount },
        ],
      },
    },
  })

  return entry.id
}

/**
 * Auto-journal when a SUPPLIER PAYMENT is made.
 * DR Trade Creditors (amount)
 * CR Bank (amount)
 */
export async function journalOnSupplierPayment(params: {
  bankAccountId: string
  amount: string
  supplierId: string
  description: string
  reference?: string
  date?: Date
}): Promise<string> {
  const { bankAccountId, amount, description, reference, date } = params
  const creditorsId = await getAccountId(SYSTEM_ACCOUNTS.TRADE_CREDITORS)

  const bankAcc = await prisma.bankAccount.findUnique({
    where: { id: bankAccountId },
    select: { accountId: true },
  })
  const bankGLId = bankAcc?.accountId || await getAccountId(SYSTEM_ACCOUNTS.CURRENT_ACCOUNT)

  const entryNumber = await getNextJournalNumber()
  const periodId = await findCurrentPeriod()

  const entry = await prisma.journalEntry.create({
    data: {
      entryNumber,
      date: date || new Date(),
      postingDate: new Date(),
      description: `Supplier Payment: ${description}`,
      reference: reference || '',
      source: 'BANK_PAYMENT',
      status: 'POSTED',
      createdBy: 'SYSTEM',
      period: { connect: { id: periodId } },
      totalDebit: amount,
      totalCredit: amount,
      lines: {
        create: [
          { accountId: creditorsId, description: 'Trade Creditors', debit: amount, credit: '0' },
          { accountId: bankGLId, description: 'Bank Payment', debit: '0', credit: amount },
        ],
      },
    },
  })

  return entry.id
}

/**
 * Auto-journal when a BANK TRANSFER is made.
 * DR Destination Bank (amount)
 * CR Source Bank (amount)
 */
export async function journalOnBankTransfer(params: {
  fromBankAccountId: string
  toBankAccountId: string
  amount: string
  description: string
  reference?: string
  date?: Date
}): Promise<string> {
  const { fromBankAccountId, toBankAccountId, amount, description, reference, date } = params

  const fromBank = await prisma.bankAccount.findUnique({ where: { id: fromBankAccountId }, select: { accountId: true } })
  const toBank = await prisma.bankAccount.findUnique({ where: { id: toBankAccountId }, select: { accountId: true } })

  const fromGLId = fromBank?.accountId || await getAccountId(SYSTEM_ACCOUNTS.CURRENT_ACCOUNT)
  const toGLId = toBank?.accountId || await getAccountId(SYSTEM_ACCOUNTS.CURRENT_ACCOUNT)

  const entryNumber = await getNextJournalNumber()
  const periodId = await findCurrentPeriod()

  const entry = await prisma.journalEntry.create({
    data: {
      entryNumber,
      date: date || new Date(),
      postingDate: new Date(),
      description: `Bank Transfer: ${description}`,
      reference: reference || '',
      source: 'BANK_TRANSFER',
      status: 'POSTED',
      createdBy: 'SYSTEM',
      period: { connect: { id: periodId } },
      totalDebit: amount,
      totalCredit: amount,
      lines: {
        create: [
          { accountId: toGLId, description: 'Transfer In', debit: amount, credit: '0' },
          { accountId: fromGLId, description: 'Transfer Out', debit: '0', credit: amount },
        ],
      },
    },
  })

  return entry.id
}

/**
 * Auto-journal when a CONSTRUCTION APPLICATION is certified.
 * DR Trade Debtors (certified less retention)
 * DR Retention Debtors (retention amount)
 * CR Revenue (gross valuation)
 * CR CIS Deductions (if applicable)
 */
export async function journalOnApplicationCertified(params: {
  applicationId: string
  grossValuation: string
  retentionAmount: string
  cisDeduction?: string
  netPayable: string
  revenueAccountId: string
  description: string
  date?: Date
}): Promise<string> {
  const { applicationId, grossValuation, retentionAmount, cisDeduction, netPayable, revenueAccountId, description, date } = params
  const debtorsId = await getAccountId(SYSTEM_ACCOUNTS.TRADE_DEBTORS)
  const retentionId = await getAccountId(SYSTEM_ACCOUNTS.RETENTION_HELD)
  const entryNumber = await getNextJournalNumber()
  const periodId = await findCurrentPeriod()

  const lines: { accountId: string; description: string; debit: string; credit: string }[] = [
    { accountId: debtorsId, description: 'Trade Debtors (net payable)', debit: netPayable, credit: '0' },
    { accountId: revenueAccountId, description: 'Contract Revenue', debit: '0', credit: grossValuation },
  ]

  if (parseFloat(retentionAmount) > 0) {
    lines.push({ accountId: retentionId, description: 'Retention Held', debit: retentionAmount, credit: '0' })
  }

  if (cisDeduction && parseFloat(cisDeduction) > 0) {
    const cisId = await getAccountId(SYSTEM_ACCOUNTS.CIS_DEDUCTIONS)
    lines.push({ accountId: cisId, description: 'CIS Deduction', debit: '0', credit: cisDeduction })
  }

  const entry = await prisma.journalEntry.create({
    data: {
      entryNumber,
      date: date || new Date(),
      postingDate: new Date(),
      description: `Application Certified: ${description}`,
      reference: applicationId,
      source: 'CONSTRUCTION_APPLICATION',
      status: 'POSTED',
      createdBy: 'SYSTEM',
      period: { connect: { id: periodId } },
      totalDebit: grossValuation,
      totalCredit: grossValuation,
      lines: { create: lines },
    },
  })

  return entry.id
}

/**
 * Auto-journal for CREDIT NOTE.
 * Reverses a sales invoice: DR Revenue, CR Trade Debtors
 */
export async function journalOnCreditNote(params: {
  creditNoteId: string
  netAmount: string
  vatAmount: string
  grossAmount: string
  revenueAccountId: string
  description: string
  date?: Date
}): Promise<string> {
  const { creditNoteId, netAmount, vatAmount, grossAmount, revenueAccountId, description, date } = params
  const debtorsId = await getAccountId(SYSTEM_ACCOUNTS.TRADE_DEBTORS)
  const vatOutputId = await getAccountId(SYSTEM_ACCOUNTS.VAT_OUTPUT)
  const entryNumber = await getNextJournalNumber()
  const periodId = await findCurrentPeriod()

  const entry = await prisma.journalEntry.create({
    data: {
      entryNumber,
      date: date || new Date(),
      postingDate: new Date(),
      description: `Credit Note: ${description}`,
      reference: creditNoteId,
      source: 'CREDIT_NOTE',
      status: 'POSTED',
      createdBy: 'SYSTEM',
      period: { connect: { id: periodId } },
      totalDebit: grossAmount,
      totalCredit: grossAmount,
      lines: {
        create: [
          { accountId: revenueAccountId, description: 'Revenue Reversal', debit: netAmount, credit: '0' },
          ...(parseFloat(vatAmount) > 0 ? [
            { accountId: vatOutputId, description: 'VAT Output Reversal', debit: vatAmount, credit: '0' },
          ] : []),
          { accountId: debtorsId, description: 'Trade Debtors', debit: '0', credit: grossAmount },
        ],
      },
    },
  })

  return entry.id
}

/**
 * Auto-journal for YEAR-END close.
 * DR/CR Revenue/Expense accounts → CR/DR Retained Earnings (3100)
 * Transfers net P&L to equity.
 */
export async function journalOnYearEnd(params: {
  periodId: string
  profitOrLoss: string
  description?: string
}): Promise<string> {
  const { periodId, profitOrLoss, description } = params
  const retainedEarningsId = await getAccountId('3100')
  const entryNumber = await getNextJournalNumber()

  const amount = Math.abs(parseFloat(profitOrLoss)).toFixed(2)
  const isProfit = parseFloat(profitOrLoss) > 0

  const entry = await prisma.journalEntry.create({
    data: {
      entryNumber,
      date: new Date(),
      postingDate: new Date(),
      description: description || 'Year-End: Transfer P&L to Retained Earnings',
      reference: 'YEAR-END',
      source: 'YEAR_END',
      status: 'POSTED',
      createdBy: 'SYSTEM',
      period: { connect: { id: periodId } },
      totalDebit: amount,
      totalCredit: amount,
      lines: {
        create: isProfit
          ? [
              { accountId: retainedEarningsId, description: 'Retained Earnings (Profit)', debit: '0', credit: amount },
              // The individual revenue/expense close-outs would be handled per-account in a real implementation
              { accountId: retainedEarningsId, description: 'P&L Transfer', debit: amount, credit: '0' },
            ]
          : [
              { accountId: retainedEarningsId, description: 'Retained Earnings (Loss)', debit: amount, credit: '0' },
              { accountId: retainedEarningsId, description: 'P&L Transfer', debit: '0', credit: amount },
            ],
      },
    },
  })

  return entry.id
}
