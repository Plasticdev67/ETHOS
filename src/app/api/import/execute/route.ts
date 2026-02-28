import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

const VALID_IMPORT_TYPES = [
  "customers",
  "suppliers",
  "accounts",
  "balances",
  "products",
  "purchase-orders",
  "sales-invoices",
] as const

type ImportType = (typeof VALID_IMPORT_TYPES)[number]

const VALID_ACCOUNT_TYPES = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"] as const
type AccountType = (typeof VALID_ACCOUNT_TYPES)[number]

interface ImportError {
  row: number
  message: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { importType, fieldMapping, data, dryRun } = body as {
      importType: string
      fieldMapping: Record<string, string>
      data: string[][]
      dryRun?: boolean
    }

    if (!importType || !VALID_IMPORT_TYPES.includes(importType as ImportType)) {
      return NextResponse.json(
        { error: `Invalid importType. Must be one of: ${VALID_IMPORT_TYPES.join(", ")}` },
        { status: 400 }
      )
    }

    if (!fieldMapping || !data || !Array.isArray(data)) {
      return NextResponse.json(
        { error: "fieldMapping and data are required" },
        { status: 400 }
      )
    }

    // Map each row from array to object using fieldMapping
    const mappedRows = data.map((row) => {
      const obj: Record<string, string> = {}
      Object.entries(fieldMapping).forEach(([csvIndex, ethosField]) => {
        if (ethosField && ethosField !== "" && ethosField !== "skip") {
          const idx = parseInt(csvIndex, 10)
          obj[ethosField] = row[idx] || ""
        }
      })
      return obj
    })

    let created = 0
    let skipped = 0
    const errors: ImportError[] = []

    switch (importType as ImportType) {
      case "customers":
        await executeCustomers(mappedRows, dryRun || false, errors, (c, s) => {
          created = c
          skipped = s
        })
        break
      case "suppliers":
        await executeSuppliers(mappedRows, dryRun || false, errors, (c, s) => {
          created = c
          skipped = s
        })
        break
      case "accounts":
        await executeAccounts(mappedRows, dryRun || false, errors, (c, s) => {
          created = c
          skipped = s
        })
        break
      case "balances":
        await executeBalances(mappedRows, dryRun || false, errors, (c, s) => {
          created = c
          skipped = s
        })
        break
      case "products":
        await executeProducts(mappedRows, dryRun || false, errors, (c, s) => {
          created = c
          skipped = s
        })
        break
      case "purchase-orders":
        await executePurchaseOrders(mappedRows, dryRun || false, errors, (c, s) => {
          created = c
          skipped = s
        })
        break
      case "sales-invoices":
        await executeSalesInvoices(mappedRows, dryRun || false, errors, (c, s) => {
          created = c
          skipped = s
        })
        break
    }

    // Record the import in the log (only for real imports)
    if (!dryRun) {
      try {
        await prisma.financeDataImport.create({
          data: {
            type: importType,
            filename: `wizard-import-${importType}-${Date.now()}`,
            totalRows: data.length,
            validRows: created,
            importedRows: created,
            errorRows: errors.length,
            status: errors.length === 0 ? "IMPORT_COMPLETED" : "IMPORT_COMPLETED",
            errors: errors.length > 0 ? JSON.parse(JSON.stringify(errors)) : undefined,
            createdBy: "system",
            completedAt: new Date(),
          },
        })
      } catch {
        // Don't fail the import if logging fails
      }
    }

    return NextResponse.json({
      dryRun: dryRun || false,
      created,
      skipped,
      errors,
    })
  } catch (error) {
    console.error("Import execution error:", error)
    return NextResponse.json(
      { error: "Import execution failed" },
      { status: 500 }
    )
  }
}

// ── Executors ───────────────────────────────────────────────

type ResultCallback = (created: number, skipped: number) => void

async function executeCustomers(
  rows: Record<string, string>[],
  dryRun: boolean,
  errors: ImportError[],
  setResult: ResultCallback
) {
  let created = 0
  let skipped = 0

  if (dryRun) {
    // Just count what would be created
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row.name?.trim()) {
        errors.push({ row: i + 1, message: "Name is required" })
        skipped++
        continue
      }
      created++
    }
    setResult(created, skipped)
    return
  }

  // Real import — use transaction for atomicity
  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row.name?.trim()) {
        errors.push({ row: i + 1, message: "Name is required — skipped" })
        skipped++
        continue
      }

      try {
        await tx.customer.create({
          data: {
            name: row.name.trim(),
            customerType: mapCustomerType(row.customerType),
            email: row.email?.trim() || null,
            phone: row.phone?.trim() || null,
            address: buildAddress(row),
            addressLine1: row.addressLine1?.trim() || null,
            addressLine2: row.addressLine2?.trim() || null,
            city: row.city?.trim() || null,
            county: row.county?.trim() || null,
            postcode: row.postcode?.trim() || null,
            paymentTermsDays: row.paymentTermsDays ? parseInt(row.paymentTermsDays, 10) || 30 : 30,
            paymentTerms: row.paymentTerms?.trim() || null,
            vatNumber: row.vatNumber?.trim() || null,
            accountCode: row.accountCode?.trim() || null,
            notes: row.notes?.trim() || null,
          },
        })
        created++
      } catch (e: unknown) {
        errors.push({
          row: i + 1,
          message: e instanceof Error ? e.message : "Unknown error",
        })
        skipped++
      }
    }
  })

  setResult(created, skipped)
}

async function executeSuppliers(
  rows: Record<string, string>[],
  dryRun: boolean,
  errors: ImportError[],
  setResult: ResultCallback
) {
  let created = 0
  let skipped = 0

  if (dryRun) {
    for (let i = 0; i < rows.length; i++) {
      if (!rows[i].name?.trim()) {
        errors.push({ row: i + 1, message: "Name is required" })
        skipped++
        continue
      }
      created++
    }
    setResult(created, skipped)
    return
  }

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row.name?.trim()) {
        errors.push({ row: i + 1, message: "Name is required — skipped" })
        skipped++
        continue
      }

      try {
        await tx.supplier.create({
          data: {
            name: row.name.trim(),
            email: row.email?.trim() || null,
            phone: row.phone?.trim() || null,
            address: buildAddress(row),
            addressLine1: row.addressLine1?.trim() || null,
            addressLine2: row.addressLine2?.trim() || null,
            city: row.city?.trim() || null,
            county: row.county?.trim() || null,
            postcode: row.postcode?.trim() || null,
            whatTheySupply: row.whatTheySupply?.trim() || null,
            paymentTermsDays: row.paymentTermsDays ? parseInt(row.paymentTermsDays, 10) || 30 : 30,
            paymentTerms: row.paymentTerms?.trim() || null,
            vatNumber: row.vatNumber?.trim() || null,
            accountCode: row.accountCode?.trim() || null,
            notes: row.notes?.trim() || null,
          },
        })
        created++
      } catch (e: unknown) {
        errors.push({
          row: i + 1,
          message: e instanceof Error ? e.message : "Unknown error",
        })
        skipped++
      }
    }
  })

  setResult(created, skipped)
}

async function executeAccounts(
  rows: Record<string, string>[],
  dryRun: boolean,
  errors: ImportError[],
  setResult: ResultCallback
) {
  let created = 0
  let skipped = 0

  if (dryRun) {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row.code?.trim() || !row.name?.trim() || !row.type?.trim()) {
        errors.push({ row: i + 1, message: "Code, name and type are all required" })
        skipped++
        continue
      }
      created++
    }
    setResult(created, skipped)
    return
  }

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const code = row.code?.trim()
      const name = row.name?.trim()
      const typeStr = row.type?.trim().toUpperCase()

      if (!code || !name || !typeStr) {
        errors.push({ row: i + 1, message: "Code, name and type are all required — skipped" })
        skipped++
        continue
      }

      if (!VALID_ACCOUNT_TYPES.includes(typeStr as AccountType)) {
        errors.push({ row: i + 1, message: `Invalid account type: ${typeStr}` })
        skipped++
        continue
      }

      const accountType = typeStr as AccountType
      // Determine normal balance from type
      const normalBalance =
        accountType === "ASSET" || accountType === "EXPENSE" ? "DEBIT" : "CREDIT"

      // Override with explicit balance type if provided
      const explicitBalance = row.balanceType?.trim().toUpperCase()
      const finalBalance =
        explicitBalance === "DEBIT" || explicitBalance === "CREDIT"
          ? explicitBalance
          : normalBalance

      try {
        await tx.account.upsert({
          where: { code },
          update: {
            name,
            type: accountType,
            subType: row.subType?.trim() || null,
            description: row.description?.trim() || null,
            vatCode: row.vatCode?.trim() || null,
            isActive: true,
          },
          create: {
            code,
            name,
            type: accountType,
            normalBalance: finalBalance as "DEBIT" | "CREDIT",
            subType: row.subType?.trim() || null,
            description: row.description?.trim() || null,
            vatCode: row.vatCode?.trim() || null,
            isActive: true,
          },
        })
        created++
      } catch (e: unknown) {
        errors.push({
          row: i + 1,
          message: e instanceof Error ? e.message : "Unknown error",
        })
        skipped++
      }
    }
  })

  setResult(created, skipped)
}

async function executeBalances(
  rows: Record<string, string>[],
  dryRun: boolean,
  errors: ImportError[],
  setResult: ResultCallback
) {
  // Pre-fetch accounts
  const accounts = await prisma.account.findMany({
    select: { id: true, code: true },
  })
  const accountByCode = new Map(accounts.map((a) => [a.code, a.id]))

  // Build journal lines
  const journalLines: { accountId: string; description: string; debit: number; credit: number }[] = []
  let totalDebit = 0
  let totalCredit = 0
  let skipped = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const code = row.accountCode?.trim()
    if (!code) {
      errors.push({ row: i + 1, message: "Account code is required" })
      skipped++
      continue
    }

    const accountId = accountByCode.get(code)
    if (!accountId) {
      errors.push({ row: i + 1, message: `Account "${code}" not found` })
      skipped++
      continue
    }

    const debit = parseAmount(row.debit) || 0
    const credit = parseAmount(row.credit) || 0

    if (debit === 0 && credit === 0) {
      errors.push({ row: i + 1, message: "Must have a debit or credit amount" })
      skipped++
      continue
    }

    if (debit > 0 && credit > 0) {
      errors.push({ row: i + 1, message: "Cannot have both debit and credit" })
      skipped++
      continue
    }

    totalDebit += debit
    totalCredit += credit

    journalLines.push({
      accountId,
      description: row.description?.trim() || `Opening balance — ${code}`,
      debit,
      credit,
    })
  }

  const created = journalLines.length

  if (dryRun) {
    setResult(created, skipped)
    return
  }

  if (journalLines.length === 0) {
    setResult(0, skipped)
    return
  }

  // Find an open accounting period
  const period = await prisma.accountingPeriod.findFirst({
    where: { status: "OPEN" },
    orderBy: { startDate: "asc" },
  })

  if (!period) {
    errors.push({ row: 0, message: "No open accounting period found — cannot create journal entry" })
    setResult(0, rows.length)
    return
  }

  // Generate unique entry number
  const entryNumber = `OB-${Date.now()}`

  try {
    await prisma.$transaction(async (tx) => {
      await tx.journalEntry.create({
        data: {
          entryNumber,
          date: new Date(),
          periodId: period.id,
          description: "Opening Balances Import",
          reference: "SAGE-IMPORT",
          source: "MANUAL",
          status: "JOURNAL_DRAFT",
          totalDebit,
          totalCredit,
          createdBy: "system",
          lines: {
            create: journalLines,
          },
        },
      })
    })
  } catch (e: unknown) {
    errors.push({
      row: 0,
      message: `Journal creation failed: ${e instanceof Error ? e.message : "Unknown error"}`,
    })
    setResult(0, rows.length)
    return
  }

  setResult(created, skipped)
}

async function executeProducts(
  rows: Record<string, string>[],
  dryRun: boolean,
  errors: ImportError[],
  setResult: ResultCallback
) {
  const projects = await prisma.project.findMany({
    select: { id: true, projectNumber: true },
  })
  const projectsByNumber = new Map(projects.map((p) => [p.projectNumber, p.id]))

  let created = 0
  let skipped = 0

  if (dryRun) {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row.description?.trim()) {
        errors.push({ row: i + 1, message: "Description is required" })
        skipped++
        continue
      }
      if (!row.projectNumber?.trim() || !projectsByNumber.has(row.projectNumber.trim())) {
        errors.push({ row: i + 1, message: `Project not found` })
        skipped++
        continue
      }
      created++
    }
    setResult(created, skipped)
    return
  }

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const description = row.description?.trim()
      const projectNumber = row.projectNumber?.trim()

      if (!description) {
        errors.push({ row: i + 1, message: "Description is required — skipped" })
        skipped++
        continue
      }

      const projectId = projectNumber ? projectsByNumber.get(projectNumber) : null
      if (!projectId) {
        errors.push({ row: i + 1, message: `Project "${projectNumber}" not found — skipped` })
        skipped++
        continue
      }

      try {
        await tx.product.create({
          data: {
            projectId,
            partCode: row.partCode?.trim() || description.substring(0, 30),
            description,
            additionalDetails: row.additionalDetails?.trim() || null,
            quantity: row.quantity ? parseInt(row.quantity, 10) || 1 : 1,
            productJobNumber: row.jobNumber?.trim() || null,
            drawingNumber: row.drawingNumber?.trim() || null,
          },
        })
        created++
      } catch (e: unknown) {
        errors.push({
          row: i + 1,
          message: e instanceof Error ? e.message : "Unknown error",
        })
        skipped++
      }
    }
  })

  setResult(created, skipped)
}

async function executePurchaseOrders(
  rows: Record<string, string>[],
  dryRun: boolean,
  errors: ImportError[],
  setResult: ResultCallback
) {
  const suppliers = await prisma.supplier.findMany({
    select: { id: true, name: true },
  })
  const supplierByName = new Map(suppliers.map((s) => [s.name.toLowerCase(), s.id]))

  const projects = await prisma.project.findMany({
    select: { id: true, projectNumber: true },
  })
  const projectsByNumber = new Map(projects.map((p) => [p.projectNumber, p.id]))

  // Group rows by PO number (or by supplier+project if no PO number)
  const poGroups = new Map<string, { rows: Record<string, string>[]; indices: number[] }>()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const poKey = row.poNumber?.trim() || `${row.supplierName?.trim()}_${row.projectNumber?.trim()}_${i}`
    if (!poGroups.has(poKey)) {
      poGroups.set(poKey, { rows: [], indices: [] })
    }
    poGroups.get(poKey)!.rows.push(row)
    poGroups.get(poKey)!.indices.push(i)
  }

  let created = 0
  let skipped = 0

  if (dryRun) {
    for (const [, group] of poGroups) {
      const first = group.rows[0]
      const supplierName = first.supplierName?.trim()?.toLowerCase()
      const projectNumber = first.projectNumber?.trim()

      if (!supplierName || !supplierByName.has(supplierName)) {
        group.indices.forEach((idx) => errors.push({ row: idx + 1, message: "Supplier not found" }))
        skipped += group.rows.length
        continue
      }
      if (!projectNumber || !projectsByNumber.has(projectNumber)) {
        group.indices.forEach((idx) => errors.push({ row: idx + 1, message: "Project not found" }))
        skipped += group.rows.length
        continue
      }
      created += group.rows.length
    }
    setResult(created, skipped)
    return
  }

  await prisma.$transaction(async (tx) => {
    for (const [poKey, group] of poGroups) {
      const first = group.rows[0]
      const supplierName = first.supplierName?.trim()?.toLowerCase()
      const projectNumber = first.projectNumber?.trim()

      const supplierId = supplierName ? supplierByName.get(supplierName) : null
      const projectId = projectNumber ? projectsByNumber.get(projectNumber) : null

      if (!supplierId) {
        group.indices.forEach((idx) =>
          errors.push({ row: idx + 1, message: `Supplier not found — skipped` })
        )
        skipped += group.rows.length
        continue
      }

      if (!projectId) {
        group.indices.forEach((idx) =>
          errors.push({ row: idx + 1, message: `Project not found — skipped` })
        )
        skipped += group.rows.length
        continue
      }

      try {
        // Generate PO number
        const poNumber = first.poNumber?.trim() || `IMP-PO-${Date.now()}-${poKey.substring(0, 8)}`

        // Calculate totals
        let subtotal = 0
        const lines = group.rows.map((row) => {
          const qty = parseInt(row.quantity?.trim() || "1", 10) || 1
          const unitCost = parseAmount(row.unitCost) || 0
          const totalCost = qty * unitCost
          subtotal += totalCost
          return {
            description: row.description?.trim() || "Imported line",
            quantity: qty,
            unitCost,
            totalCost,
            netAmount: totalCost,
          }
        })

        await tx.purchaseOrder.create({
          data: {
            poNumber,
            projectId,
            supplierId,
            status: "DRAFT",
            dateRaised: first.dateRaised ? new Date(first.dateRaised) : new Date(),
            expectedDelivery: first.expectedDelivery ? new Date(first.expectedDelivery) : null,
            subtotal,
            totalValue: subtotal,
            notes: first.notes?.trim() || "Imported from Sage",
            poLines: {
              create: lines,
            },
          },
        })
        created += group.rows.length
      } catch (e: unknown) {
        group.indices.forEach((idx) =>
          errors.push({
            row: idx + 1,
            message: e instanceof Error ? e.message : "Unknown error",
          })
        )
        skipped += group.rows.length
      }
    }
  })

  setResult(created, skipped)
}

async function executeSalesInvoices(
  rows: Record<string, string>[],
  dryRun: boolean,
  errors: ImportError[],
  setResult: ResultCallback
) {
  const customers = await prisma.customer.findMany({
    select: { id: true, name: true },
  })
  const customerByName = new Map(customers.map((c) => [c.name.toLowerCase(), c.id]))

  const projects = await prisma.project.findMany({
    select: { id: true, projectNumber: true },
  })
  const projectsByNumber = new Map(projects.map((p) => [p.projectNumber, p.id]))

  // Group rows by invoice number
  const invoiceGroups = new Map<string, { rows: Record<string, string>[]; indices: number[] }>()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const invKey = row.invoiceNumber?.trim() || `INV-${i}`
    if (!invoiceGroups.has(invKey)) {
      invoiceGroups.set(invKey, { rows: [], indices: [] })
    }
    invoiceGroups.get(invKey)!.rows.push(row)
    invoiceGroups.get(invKey)!.indices.push(i)
  }

  let created = 0
  let skipped = 0

  if (dryRun) {
    for (const [, group] of invoiceGroups) {
      const first = group.rows[0]
      const customerName = first.customerName?.trim()?.toLowerCase()

      if (!customerName || !customerByName.has(customerName)) {
        group.indices.forEach((idx) => errors.push({ row: idx + 1, message: "Customer not found" }))
        skipped += group.rows.length
        continue
      }
      created += group.rows.length
    }
    setResult(created, skipped)
    return
  }

  await prisma.$transaction(async (tx) => {
    for (const [invKey, group] of invoiceGroups) {
      const first = group.rows[0]
      const customerName = first.customerName?.trim()?.toLowerCase()

      const customerId = customerName ? customerByName.get(customerName) : null
      if (!customerId) {
        group.indices.forEach((idx) =>
          errors.push({ row: idx + 1, message: `Customer not found — skipped` })
        )
        skipped += group.rows.length
        continue
      }

      const projectNumber = first.projectNumber?.trim()
      const projectId = projectNumber ? projectsByNumber.get(projectNumber) || null : null

      try {
        const invoiceNumber = first.invoiceNumber?.trim() || `IMP-SI-${Date.now()}-${invKey}`

        // Build lines
        let subtotal = 0
        let vatTotal = 0
        const lines = group.rows.map((row) => {
          const qty = parseFloat(row.quantity?.trim() || "1") || 1
          const unitPrice = parseAmount(row.unitPrice) || parseAmount(row.netAmount) || 0
          const netAmount = qty * unitPrice
          const vatAmount = parseAmount(row.vatAmount) || 0
          subtotal += netAmount
          vatTotal += vatAmount
          return {
            description: row.description?.trim() || "Imported line",
            quantity: qty,
            unitPrice,
            netAmount,
            vatAmount: vatAmount || null,
            projectId,
          }
        })

        await tx.salesInvoice.create({
          data: {
            invoiceNumber,
            customerId,
            projectId,
            type: "INTERIM_INVOICE",
            status: "DRAFT",
            subtotal,
            vatAmount: vatTotal,
            total: subtotal + vatTotal,
            dateSubmitted: first.invoiceDate ? new Date(first.invoiceDate) : new Date(),
            dateDue: first.dueDate ? new Date(first.dueDate) : null,
            notes: first.notes?.trim() || "Imported from Sage",
            createdBy: "system",
            lines: {
              create: lines,
            },
          },
        })
        created += group.rows.length
      } catch (e: unknown) {
        group.indices.forEach((idx) =>
          errors.push({
            row: idx + 1,
            message: e instanceof Error ? e.message : "Unknown error",
          })
        )
        skipped += group.rows.length
      }
    }
  })

  setResult(created, skipped)
}

// ── Helpers ─────────────────────────────────────────────────

function mapCustomerType(
  val?: string
): "MAIN_CONTRACTOR" | "UTILITY" | "COUNCIL" | "DIRECT" | "DEFENCE" | "OTHER" {
  if (!val) return "OTHER"
  const v = val.toUpperCase().replace(/[_\s-]/g, "")
  if (v.includes("MAIN") || v.includes("CONTRACTOR")) return "MAIN_CONTRACTOR"
  if (v.includes("UTIL")) return "UTILITY"
  if (v.includes("COUNCIL") || v.includes("LOCAL")) return "COUNCIL"
  if (v.includes("DIRECT")) return "DIRECT"
  if (v.includes("DEFEN") || v.includes("MOD")) return "DEFENCE"
  return "OTHER"
}

function buildAddress(row: Record<string, string>): string | null {
  const parts = [
    row.addressLine1?.trim(),
    row.addressLine2?.trim(),
    row.city?.trim(),
    row.county?.trim(),
    row.postcode?.trim(),
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(", ") : null
}

function parseAmount(val: string | undefined): number | null {
  if (!val || !val.trim()) return null
  const cleaned = val.trim().replace(/[£$€,\s]/g, "")
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}
