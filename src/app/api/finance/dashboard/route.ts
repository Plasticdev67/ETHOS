import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function GET() {
  try {
    const user = await requireAuth()
    if (user instanceof NextResponse) return user

    // --- Bank Balances ---
    const bankAccounts = await prisma.bankAccount.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        currentBalance: true,
      },
      orderBy: { name: "asc" },
    })

    const bankTotal = bankAccounts.reduce(
      (sum, acc) => sum + Number(acc.currentBalance),
      0
    )

    // --- Debtors (outstanding sales invoices) ---
    const debtorInvoices = await prisma.salesInvoice.findMany({
      where: {
        status: { in: ["DRAFT", "SUBMITTED", "CERTIFIED", "OVERDUE"] },
      },
      select: { total: true, netPayable: true },
    })

    const debtorsCount = debtorInvoices.length
    const debtorsTotal = debtorInvoices.reduce(
      (sum, inv) => sum + Number(inv.total ?? inv.netPayable ?? 0),
      0
    )

    // --- Creditors (outstanding purchase invoices) ---
    const creditorInvoices = await prisma.purchaseInvoice.findMany({
      where: {
        status: {
          in: ["ACC_DRAFT", "ACC_APPROVED", "ACC_POSTED", "PARTIALLY_PAID"],
        },
      },
      select: { total: true },
    })

    const creditorsCount = creditorInvoices.length
    const creditorsTotal = creditorInvoices.reduce(
      (sum, inv) => sum + Number(inv.total),
      0
    )

    // --- Construction Contracts ---
    const activeContracts = await prisma.constructionContract.findMany({
      where: { status: "CONTRACT_ACTIVE" },
      select: { currentValue: true },
    })

    const contractsCount = activeContracts.length
    const contractValue = activeContracts.reduce(
      (sum, c) => sum + Number(c.currentValue),
      0
    )

    const applications = await prisma.applicationForPayment.findMany({
      where: {
        contract: { status: "CONTRACT_ACTIVE" },
      },
      select: {
        certifiedAmount: true,
        retentionHeld: true,
        status: true,
      },
    })

    const certifiedToDate = applications.reduce(
      (sum, a) => sum + Number(a.certifiedAmount ?? 0),
      0
    )
    const retentionHeld = applications.reduce(
      (sum, a) => sum + Number(a.retentionHeld),
      0
    )
    const submittedApplicationsCount = applications.filter(
      (a) => a.status === "APP_SUBMITTED"
    ).length

    // --- P&L (Revenue vs Expenses from posted journal lines) ---
    const revenueLines = await prisma.journalLine.findMany({
      where: {
        journal: { status: "POSTED" },
        account: { type: "REVENUE" },
      },
      select: { debit: true, credit: true },
    })

    const revenue = revenueLines.reduce(
      (sum, l) => sum + Number(l.credit) - Number(l.debit),
      0
    )

    const expenseLines = await prisma.journalLine.findMany({
      where: {
        journal: { status: "POSTED" },
        account: { type: "EXPENSE" },
      },
      select: { debit: true, credit: true },
    })

    const expenses = expenseLines.reduce(
      (sum, l) => sum + Number(l.debit) - Number(l.credit),
      0
    )

    // --- Recent Journal Entries ---
    const recentJournals = await prisma.journalEntry.findMany({
      take: 10,
      orderBy: { date: "desc" },
      select: {
        id: true,
        entryNumber: true,
        date: true,
        description: true,
        source: true,
        totalDebit: true,
        totalCredit: true,
        status: true,
      },
    })

    return NextResponse.json({
      bank: {
        total: bankTotal,
        accounts: bankAccounts.map((a) => ({
          id: a.id,
          accountName: a.name,
          currentBalance: Number(a.currentBalance),
        })),
      },
      debtors: {
        count: debtorsCount,
        total: debtorsTotal,
      },
      creditors: {
        count: creditorsCount,
        total: creditorsTotal,
      },
      contracts: {
        count: contractsCount,
        contractValue,
        certifiedToDate,
        retentionHeld,
        submittedApplications: submittedApplicationsCount,
      },
      profitAndLoss: {
        revenue,
        expenses,
        netProfit: revenue - expenses,
      },
      recentJournals,
    })
  } catch (error) {
    console.error("Finance dashboard error:", error)
    return NextResponse.json(
      { error: "Failed to load dashboard data" },
      { status: 500 }
    )
  }
}
