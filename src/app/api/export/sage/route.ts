import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

// Export data in Sage-compatible CSV format
export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type")

  if (type === "customers") {
    const customers = await prisma.customer.findMany({
      orderBy: { name: "asc" },
      include: { contacts: { where: { isPrimary: true }, take: 1 } },
    })
    const csv = [
      "Account Ref,Company Name,Contact,Address,Phone,Email,Payment Terms,Type",
      ...customers.map((c, i) => {
        const contact = c.contacts[0]
        return [
          `CUS${String(i + 1).padStart(4, "0")}`,
          quote(c.name),
          quote(contact?.name || ""),
          quote(c.address || ""),
          quote(c.phone || ""),
          quote(c.email || ""),
          quote(c.paymentTerms || "30 days"),
          quote(c.customerType),
        ].join(",")
      }),
    ].join("\n")

    return csvResponse(csv, "sage-customers.csv")
  }

  if (type === "suppliers") {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: "asc" },
      include: { contacts: { where: { isPrimary: true }, take: 1 } },
    })
    const csv = [
      "Account Ref,Company Name,Contact,Address,Phone,Email,Payment Terms,What They Supply",
      ...suppliers.map((s, i) => {
        const contact = s.contacts[0]
        return [
          `SUP${String(i + 1).padStart(4, "0")}`,
          quote(s.name),
          quote(contact?.name || ""),
          quote(s.address || ""),
          quote(s.phone || ""),
          quote(s.email || ""),
          quote(s.paymentTerms || "30 days"),
          quote(s.whatTheySupply || ""),
        ].join(",")
      }),
    ].join("\n")

    return csvResponse(csv, "sage-suppliers.csv")
  }

  if (type === "nominal-codes") {
    const codes = await prisma.nominalCode.findMany({
      where: { active: true },
      orderBy: { code: "asc" },
    })
    const csv = [
      "Nominal Code,Description,Category",
      ...codes.map((c) => [c.code, quote(c.description), c.category].join(",")),
    ].join("\n")

    return csvResponse(csv, "sage-nominal-codes.csv")
  }

  if (type === "invoices") {
    const invoices = await prisma.salesInvoice.findMany({
      include: { project: { select: { projectNumber: true, name: true, customer: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
    })
    const csv = [
      "Invoice No,Project,Customer,Type,Status,Application Amount,Certified Amount,Retention,CIS,Net Payable,Paid,Date Submitted,Date Due,Date Paid",
      ...invoices.map((inv) => [
        inv.invoiceNumber,
        quote(`${inv.project.projectNumber} ${inv.project.name}`),
        quote(inv.project.customer?.name || ""),
        inv.type,
        inv.status,
        num(inv.applicationAmount),
        num(inv.certifiedAmount),
        num(inv.retentionHeld),
        num(inv.cisDeduction),
        num(inv.netPayable),
        num(inv.paidAmount),
        date(inv.dateSubmitted),
        date(inv.dateDue),
        date(inv.datePaid),
      ].join(",")),
    ].join("\n")

    return csvResponse(csv, "sage-invoices.csv")
  }

  if (type === "purchase-orders") {
    const pos = await prisma.purchaseOrder.findMany({
      include: {
        project: { select: { projectNumber: true } },
        supplier: { select: { name: true } },
        poLines: { include: { nominalCode: { select: { code: true } } } },
      },
      orderBy: { createdAt: "desc" },
    })
    const lines: string[] = [
      "PO Number,Project,Supplier,Status,Line Description,Nominal Code,Qty,Unit Cost,Total,Received",
    ]
    for (const po of pos) {
      for (const line of po.poLines) {
        lines.push([
          po.poNumber,
          po.project.projectNumber,
          quote(po.supplier?.name || ""),
          po.status,
          quote(line.description),
          line.nominalCode?.code || "",
          line.quantity,
          num(line.unitCost),
          num(line.totalCost),
          line.received ? "Yes" : "No",
        ].join(","))
      }
    }

    return csvResponse(lines.join("\n"), "sage-purchase-orders.csv")
  }

  if (type === "job-costing") {
    const projects = await prisma.project.findMany({
      where: { projectStatus: { not: "OPPORTUNITY" } },
      include: {
        customer: { select: { name: true } },
        costCategories: { include: { nominalCode: { select: { code: true } } } },
        purchaseOrders: { include: { poLines: true } },
        plantHires: true,
        subContracts: true,
      },
      orderBy: { projectNumber: "asc" },
    })

    const lines: string[] = [
      "Project No,Project Name,Customer,Contract Value,Budget Total,Committed Total,Actual Total,Variance",
    ]
    for (const p of projects) {
      const budget = p.costCategories.reduce((sum, c) => sum + Number(c.budgetAmount || 0), 0)
      const committed = p.costCategories.reduce((sum, c) => sum + Number(c.committedAmount || 0), 0)
      const actual = p.costCategories.reduce((sum, c) => sum + Number(c.actualAmount || 0), 0)
      const poTotal = p.purchaseOrders.reduce((sum, po) => sum + po.poLines.reduce((s, l) => s + Number(l.totalCost || 0), 0), 0)
      const plantTotal = p.plantHires.reduce((sum, ph) => sum + Number(ph.totalCost || 0), 0)
      const subTotal = p.subContracts.reduce((sum, sc) => sum + Number(sc.agreedValue || 0), 0)
      const totalActual = actual || (poTotal + plantTotal + subTotal)

      lines.push([
        p.projectNumber,
        quote(p.name),
        quote(p.customer?.name || ""),
        num(p.contractValue),
        budget.toFixed(2),
        committed.toFixed(2),
        totalActual.toFixed(2),
        (Number(p.contractValue || 0) - totalActual).toFixed(2),
      ].join(","))
    }

    return csvResponse(lines.join("\n"), "sage-job-costing.csv")
  }

  return NextResponse.json({ error: "Unknown export type. Use: customers, suppliers, nominal-codes, invoices, purchase-orders, job-costing" }, { status: 400 })
}

function quote(s: string): string {
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function num(val: unknown): string {
  return val != null ? Number(val).toFixed(2) : "0.00"
}

function date(val: Date | null | undefined): string {
  if (!val) return ""
  return new Date(val).toLocaleDateString("en-GB")
}

function csvResponse(csv: string, filename: string) {
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
