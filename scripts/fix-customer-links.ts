import "dotenv/config"
import * as XLSX from "xlsx"
import path from "path"
import { prisma } from "../src/lib/db"

async function main() {
  console.log("\n=== Fixing unmatched customer links ===\n")

  // Read the Sage project list to get the original customer names
  const sageDir = path.resolve(__dirname, "../../Sage Export")
  const wb = XLSX.readFile(path.join(sageDir, "Export_2026-03-02T17_10_56 - Project list.xlsx"))
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" })

  // Build Sage project → customer name map (trimming header spaces)
  const sageCustomerMap = new Map<string, string>()
  for (const row of rows) {
    const projNum = String(row["Project "] ?? row["Project"] ?? "").trim()
    const custName = String(row["Customer "] ?? row["Customer"] ?? "").trim()
    if (projNum && custName) sageCustomerMap.set(projNum, custName)
  }

  // Build customer name → id lookup (case-insensitive)
  const allCustomers = await prisma.customer.findMany({
    select: { id: true, name: true },
  })
  const customerByName = new Map<string, string>()
  for (const c of allCustomers) {
    customerByName.set(c.name.toLowerCase(), c.id)
  }

  // Find all unlinked projects
  const unlinked = await prisma.project.findMany({
    where: { customerId: null },
    select: { id: true, projectNumber: true, name: true },
  })
  console.log(`Unlinked projects: ${unlinked.length}\n`)

  let fixed = 0

  for (const proj of unlinked) {
    const sageCustName = sageCustomerMap.get(proj.projectNumber)
    if (!sageCustName) {
      console.log(`  ${proj.projectNumber} | ${proj.name} — not in Sage project list, skipping`)
      continue
    }

    // Try exact match first
    let customerId = customerByName.get(sageCustName.toLowerCase())

    // Fuzzy: try contains match if exact fails
    if (!customerId) {
      // Try stripping Ltd, PLC, Limited etc and matching
      const stripped = sageCustName.replace(/\s*(Ltd\.?|PLC|Limited|Co\.?)$/i, "").trim().toLowerCase()
      for (const [name, id] of customerByName) {
        const nameStripped = name.replace(/\s*(ltd\.?|plc|limited|co\.?)$/i, "").trim()
        if (nameStripped === stripped || name.includes(stripped) || stripped.includes(nameStripped)) {
          customerId = id
          break
        }
      }
    }

    if (customerId) {
      await prisma.project.update({
        where: { id: proj.id },
        data: { customerId },
      })
      const custName = allCustomers.find(c => c.id === customerId)?.name
      console.log(`  FIXED: ${proj.projectNumber} | "${sageCustName}" → "${custName}"`)
      fixed++
    } else {
      console.log(`  UNRESOLVED: ${proj.projectNumber} | "${sageCustName}" — no matching customer found`)
    }
  }

  console.log(`\nFixed ${fixed} of ${unlinked.length} unlinked projects.`)

  const remaining = await prisma.project.count({ where: { customerId: null } })
  console.log(`Unlinked projects remaining: ${remaining}`)

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error("ERROR:", e.message)
  process.exit(1)
})
