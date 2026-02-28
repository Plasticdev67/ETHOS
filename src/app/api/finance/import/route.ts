import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, data, createdBy } = body

    if (!type || !data || !Array.isArray(data)) {
      return NextResponse.json(
        { error: "Missing required fields: type (accounts/invoices/transactions), data (JSON array)" },
        { status: 400 }
      )
    }

    const validTypes = ["accounts", "invoices", "transactions"]
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      )
    }

    let successCount = 0
    let errorCount = 0
    const errors: Array<{ row: number; error: string; data?: unknown }> = []

    // Create import record
    const importRecord = await prisma.financeDataImport.create({
      data: {
        type,
        filename: `api-import-${type}-${Date.now()}`,
        totalRows: data.length,
        status: "IMPORT_IMPORTING",
        createdBy: createdBy || "system",
      },
    })

    if (type === "accounts") {
      for (let i = 0; i < data.length; i++) {
        try {
          const row = data[i]
          if (!row.code || !row.name || !row.type) {
            errors.push({
              row: i + 1,
              error: "Missing required fields: code, name, type",
              data: row,
            })
            errorCount++
            continue
          }

          const validTypes = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]
          if (!validTypes.includes(row.type)) {
            errors.push({
              row: i + 1,
              error: `Invalid account type: ${row.type}`,
              data: row,
            })
            errorCount++
            continue
          }

          // Determine normal balance
          const normalBalance = (row.type === "ASSET" || row.type === "EXPENSE") ? "DEBIT" : "CREDIT"

          await prisma.account.upsert({
            where: { code: row.code },
            update: {
              name: row.name,
              type: row.type,
              subType: row.subType || null,
              description: row.description || null,
              vatCode: row.vatCode || null,
              isActive: row.isActive !== false,
            },
            create: {
              code: row.code,
              name: row.name,
              type: row.type,
              subType: row.subType || null,
              normalBalance,
              description: row.description || null,
              vatCode: row.vatCode || null,
              isActive: row.isActive !== false,
            },
          })
          successCount++
        } catch (err) {
          errors.push({
            row: i + 1,
            error: err instanceof Error ? err.message : "Unknown error",
            data: data[i],
          })
          errorCount++
        }
      }
    } else if (type === "invoices") {
      for (let i = 0; i < data.length; i++) {
        try {
          const row = data[i]
          if (!row.invoiceNumber || !row.supplierId || !row.invoiceDate) {
            errors.push({
              row: i + 1,
              error: "Missing required fields: invoiceNumber, supplierId, invoiceDate",
              data: row,
            })
            errorCount++
            continue
          }

          await prisma.purchaseInvoice.create({
            data: {
              invoiceNumber: row.invoiceNumber,
              supplierId: row.supplierId,
              projectId: row.projectId || null,
              invoiceDate: new Date(row.invoiceDate),
              dueDate: row.dueDate ? new Date(row.dueDate) : new Date(row.invoiceDate),
              subtotal: parseFloat(row.subtotal || "0"),
              vatAmount: parseFloat(row.vatAmount || "0"),
              total: parseFloat(row.total || "0"),
              status: row.status || "ACC_DRAFT",
              notes: row.notes || null,
              createdBy: createdBy || "system",
            },
          })
          successCount++
        } catch (err) {
          errors.push({
            row: i + 1,
            error: err instanceof Error ? err.message : "Unknown error",
            data: data[i],
          })
          errorCount++
        }
      }
    } else if (type === "transactions") {
      for (let i = 0; i < data.length; i++) {
        try {
          const row = data[i]
          if (!row.date || !row.description || !row.lines || !Array.isArray(row.lines)) {
            errors.push({
              row: i + 1,
              error: "Missing required fields: date, description, lines (array)",
              data: row,
            })
            errorCount++
            continue
          }

          // Validate debits = credits
          const totalDebit = row.lines.reduce(
            (sum: number, l: { debit?: number }) => sum + (parseFloat(String(l.debit)) || 0),
            0
          )
          const totalCredit = row.lines.reduce(
            (sum: number, l: { credit?: number }) => sum + (parseFloat(String(l.credit)) || 0),
            0
          )

          if (Math.abs(totalDebit - totalCredit) > 0.01) {
            errors.push({
              row: i + 1,
              error: `Debits (${totalDebit}) do not equal credits (${totalCredit})`,
              data: row,
            })
            errorCount++
            continue
          }

          // Need a period for the journal entry
          const txDate = new Date(row.date)
          const period = await prisma.accountingPeriod.findFirst({
            where: {
              startDate: { lte: txDate },
              endDate: { gte: txDate },
              status: "OPEN",
            },
          })

          if (!period) {
            errors.push({
              row: i + 1,
              error: "No open accounting period found for date: " + row.date,
              data: row,
            })
            errorCount++
            continue
          }

          const entryNumber = row.entryNumber || `IMP-${Date.now()}-${i}`

          await prisma.journalEntry.create({
            data: {
              entryNumber,
              date: txDate,
              periodId: period.id,
              description: row.description,
              reference: row.reference || null,
              source: "MANUAL",
              status: row.status || "JOURNAL_DRAFT",
              totalDebit,
              totalCredit,
              createdBy: createdBy || "system",
              lines: {
                create: row.lines.map(
                  (line: {
                    accountId: string
                    description?: string
                    debit?: number
                    credit?: number
                    vatCodeId?: string
                    projectId?: string
                  }) => ({
                    accountId: line.accountId,
                    description: line.description || null,
                    debit: parseFloat(String(line.debit)) || 0,
                    credit: parseFloat(String(line.credit)) || 0,
                    vatCodeId: line.vatCodeId || null,
                    projectId: line.projectId || null,
                  })
                ),
              },
            },
          })
          successCount++
        } catch (err) {
          errors.push({
            row: i + 1,
            error: err instanceof Error ? err.message : "Unknown error",
            data: data[i],
          })
          errorCount++
        }
      }
    }

    // Update import record
    await prisma.financeDataImport.update({
      where: { id: importRecord.id },
      data: {
        validRows: successCount,
        importedRows: successCount,
        errorRows: errorCount,
        status: errorCount === 0 ? "IMPORT_COMPLETED" : "IMPORT_COMPLETED",
        errors: errors.length > 0 ? errors : undefined,
        completedAt: new Date(),
      },
    })

    return NextResponse.json({
      importId: importRecord.id,
      type,
      totalRows: data.length,
      successCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error("Failed to import data:", error)
    return NextResponse.json(
      { error: "Failed to import data" },
      { status: 500 }
    )
  }
}
