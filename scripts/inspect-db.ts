import pg from "pg"
import dotenv from "dotenv"
dotenv.config()

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

function divider(title: string) {
  console.log("\n" + "=".repeat(80))
  console.log("  " + title)
  console.log("=".repeat(80))
}

function printTable(rows: Record<string, unknown>[], maxRows = 200) {
  if (!rows || rows.length === 0) {
    console.log("  (no rows)")
    return
  }
  const display = rows.slice(0, maxRows)
  console.table(display)
  if (rows.length > maxRows) console.log("  ... and " + (rows.length - maxRows) + " more rows")
}

async function main() {
  const c = await pool.connect()
  try {

    divider("1. RECORD COUNTS PER TABLE")
    const tables = [
      "users",
      "customers",
      "customer_contacts",
      "prospects",
      "opportunities",
      "opportunity_quote_lines",
      "projects",
      "products",
      "product_design_cards",
      "design_job_cards",
      "design_bom_lines",
      "design_handovers",
      "production_tasks",
      "workers",
      "quotes",
      "quote_lines",
      "quote_line_specs",
      "non_conformance_reports",
      "purchase_orders",
      "purchase_order_lines",
      "documents",
      "retention_holdbacks",
      "plant_hires",
      "sub_contractor_works",
      "nominal_codes",
      "project_cost_categories",
      "sales_invoices",
      "variations",
      "audit_logs",
      "suggestions",
      "department_capacities",
      "project_resource_estimates",
      "customer_portal_tokens",
      "product_catalogue",
      "product_families",
      "product_types",
      "product_variants",
      "spec_fields",
      "spec_choices",
      "spec_dependencies",
      "base_bom_items",
      "spec_bom_modifiers",
      "feature_tags",
      "spec_bom_mappings",
      "dimension_bom_mappings",
      "sage_stock_items",
      "sage_bom_headers",
      "sage_bom_components",
      "sage_bom_operations",
      "lock_options",
      "coating_options",
    ]
    const counts: { table_name: string; count: number }[] = []
    for (const t of tables) {
      try {
        const r = await c.query("SELECT COUNT(*)::int AS c FROM " + t)
        counts.push({ table_name: t, count: r.rows[0].c })
      } catch {
        counts.push({ table_name: t, count: -1 })
      }
    }
    printTable(counts)

    divider("2. ALL USERS AND ROLES")
    const users = await c.query(`SELECT id, name, email, role, "createdAt" FROM users ORDER BY role, name`)
    printTable(users.rows)

    divider("3. ALL PROJECTS (status, #products, customer, targetCompletion, isICUFlag)")
    const projects = await c.query(`
      SELECT p."projectNumber", p.name, p."projectStatus", p."salesStage",
        p."lifecycleStage", p."isICUFlag", p."targetCompletion",
        cu.name AS "customerName",
        (SELECT COUNT(*)::int FROM products pr WHERE pr."projectId" = p.id) AS "productCount"
      FROM projects p LEFT JOIN customers cu ON cu.id = p."customerId"
      ORDER BY p."projectNumber"
    `)
    printTable(projects.rows)

    divider("4. ORPHANED RECORDS CHECK")

    const orphanedProducts = await c.query(`
      SELECT pr.id, pr."partCode", pr."productJobNumber", pr."projectId"
      FROM products pr LEFT JOIN projects p ON p.id = pr."projectId"
      WHERE p.id IS NULL
    `)
    console.log("\n  4a. Products without a valid project: " + orphanedProducts.rows.length)
    if (orphanedProducts.rows.length > 0) printTable(orphanedProducts.rows)

    const orphanedTasks = await c.query(`
      SELECT pt.id, pt.stage, pt.status, pt."productId"
      FROM production_tasks pt LEFT JOIN products pr ON pr.id = pt."productId"
      WHERE pr.id IS NULL
    `)
    console.log("\n  4b. Production tasks without a valid product: " + orphanedTasks.rows.length)
    if (orphanedTasks.rows.length > 0) printTable(orphanedTasks.rows)

    const orphanedTaskProjects = await c.query(`
      SELECT pt.id, pt.stage, pt.status, pt."projectId"
      FROM production_tasks pt LEFT JOIN projects p ON p.id = pt."projectId"
      WHERE p.id IS NULL
    `)
    console.log("\n  4c. Production tasks without a valid project: " + orphanedTaskProjects.rows.length)
    if (orphanedTaskProjects.rows.length > 0) printTable(orphanedTaskProjects.rows)

    const orphanedDesignCards = await c.query(`
      SELECT dc.id, dc.status, dc."productId"
      FROM product_design_cards dc LEFT JOIN products pr ON pr.id = dc."productId"
      WHERE pr.id IS NULL
    `)
    console.log("\n  4d. Design cards without a valid product: " + orphanedDesignCards.rows.length)
    if (orphanedDesignCards.rows.length > 0) printTable(orphanedDesignCards.rows)

    const orphanedQuoteLines = await c.query(`
      SELECT ql.id, ql.description, ql."quoteId"
      FROM quote_lines ql LEFT JOIN quotes q ON q.id = ql."quoteId"
      WHERE q.id IS NULL
    `)
    console.log("\n  4e. Quote lines without a valid quote: " + orphanedQuoteLines.rows.length)
    if (orphanedQuoteLines.rows.length > 0) printTable(orphanedQuoteLines.rows)

    const orphanedNcrs = await c.query(`
      SELECT n.id, n."ncrNumber", n.title, n."projectId"
      FROM non_conformance_reports n LEFT JOIN projects p ON p.id = n."projectId"
      WHERE p.id IS NULL
    `)
    console.log("\n  4f. NCRs without a valid project: " + orphanedNcrs.rows.length)
    if (orphanedNcrs.rows.length > 0) printTable(orphanedNcrs.rows)

    const orphanedPoLines = await c.query(`
      SELECT pol.id, pol.description, pol."poId"
      FROM purchase_order_lines pol LEFT JOIN purchase_orders po ON po.id = pol."poId"
      WHERE po.id IS NULL
    `)
    console.log("\n  4g. PO lines without a valid purchase order: " + orphanedPoLines.rows.length)
    if (orphanedPoLines.rows.length > 0) printTable(orphanedPoLines.rows)

    divider("5. PRODUCTS WITH NULL OR EMPTY productJobNumber / partCode / description")
    const nullProducts = await c.query(`
      SELECT pr.id, pr."productJobNumber", pr."partCode", pr.description,
        pr."projectId", p."projectNumber"
      FROM products pr LEFT JOIN projects p ON p.id = pr."projectId"
      WHERE pr."productJobNumber" IS NULL OR pr."productJobNumber" = ''
         OR pr."partCode" IS NULL OR pr."partCode" = ''
         OR pr.description IS NULL OR pr.description = ''
      ORDER BY p."projectNumber"
    `)
    console.log("  Count: " + nullProducts.rows.length)
    printTable(nullProducts.rows, 50)

    divider("6. PRODUCTS -- currentDepartment & productionStatus")
    const productDepts = await c.query(`
      SELECT pr.id, pr."partCode", pr."productJobNumber",
        pr."currentDepartment", pr."productionStatus", p."projectNumber"
      FROM products pr LEFT JOIN projects p ON p.id = pr."projectId"
      ORDER BY p."projectNumber", pr."partCode"
    `)
    printTable(productDepts.rows, 100)

    const deptSummary = await c.query(`
      SELECT "currentDepartment", COUNT(*)::int AS count
      FROM products GROUP BY "currentDepartment" ORDER BY count DESC
    `)
    console.log("\n  Department summary:")
    printTable(deptSummary.rows)

    const statusSummary = await c.query(`
      SELECT "productionStatus", COUNT(*)::int AS count
      FROM products GROUP BY "productionStatus" ORDER BY count DESC
    `)
    console.log("\n  Production status summary:")
    printTable(statusSummary.rows)

    divider("7. PRODUCTS MISSING designEstimatedHours / productionEstimatedHours")
    const missingHours = await c.query(`
      SELECT pr.id, pr."partCode", pr."productJobNumber",
        pr."designEstimatedHours", pr."productionEstimatedHours", p."projectNumber"
      FROM products pr LEFT JOIN projects p ON p.id = pr."projectId"
      WHERE pr."designEstimatedHours" IS NULL OR pr."productionEstimatedHours" IS NULL
      ORDER BY p."projectNumber"
    `)
    console.log("  Count: " + missingHours.rows.length)
    printTable(missingHours.rows, 50)

    divider("8. PRODUCTION TASKS (stage, status, estimatedMins)")
    const tasks = await c.query(`
      SELECT pt.id, pt.stage, pt.status, pt."estimatedMins", pt."actualMins",
        pt."assignedTo", pt."queuePosition",
        pr."partCode" AS "productPartCode", pr."productJobNumber", p."projectNumber"
      FROM production_tasks pt
      LEFT JOIN products pr ON pr.id = pt."productId"
      LEFT JOIN projects p ON p.id = pt."projectId"
      ORDER BY p."projectNumber", pr."partCode", pt."queuePosition"
    `)
    printTable(tasks.rows, 100)

    const taskStageSummary = await c.query(`
      SELECT stage, status, COUNT(*)::int AS count
      FROM production_tasks GROUP BY stage, status ORDER BY stage, status
    `)
    console.log("\n  Task summary by stage & status:")
    printTable(taskStageSummary.rows)

    divider("INSPECTION COMPLETE")
    console.log("")

  } finally {
    c.release()
    await pool.end()
  }
}

main().catch((err) => {
  console.error("ERROR:", err)
  process.exit(1)
})