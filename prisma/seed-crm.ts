import { PrismaClient, LeadSource } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"
import "dotenv/config"

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const opportunities = [
  { company: "National Grid", name: "Wilton 275kv Substation - job TBC", contact: "tbc", source: "OTHER", closeDate: "2026-03-31", resources: "tbc", notes: "Job TBC" },
  { company: "National Grid", name: "Whitegate", contact: "tbc", source: "OTHER", closeDate: "2026-03-18", resources: "tbc", notes: "" },
  { company: "UKPN(EPN)", name: "Whapload", contact: "tbc", source: "OTHER", closeDate: "2026-06-19", resources: "Razor,Erando,Max Tucker", notes: "" },
  { company: "UKPN(EPN)", name: "Verity", contact: "tbc", source: "OTHER", closeDate: "2026-05-01", resources: "Razor,Erando,Max Tucker", notes: "" },
  { company: "Manweb", name: "Thingwall", contact: "tbc", source: "OTHER", closeDate: "2026-09-04", resources: "Andy C,Aaron Lewis,Mike Hicks", notes: "" },
  { company: "Miscellaneous", name: "Sweet Project", contact: "tbc", source: "OTHER", closeDate: "2026-04-04", resources: "Andy C,Aaron Lewis,Mike Hicks", notes: "" },
  { company: "South East Water", name: "Steyning Primary", contact: "tbc", source: "OTHER", closeDate: "2025-09-17", resources: "Damian W,SPN Extra man", notes: "" },
  { company: "National Grid", name: "South Manchester", contact: "tbc", source: "OTHER", closeDate: "2026-07-10", resources: "tbc", notes: "" },
  { company: "South East Water", name: "SEW Work 2026", contact: "tbc", source: "OTHER", closeDate: "2027-01-08", resources: "Alex Johnston,SEW second man", notes: "Duration: 210 days" },
  { company: "Manweb", name: "Orrell Mount", contact: "tbc", source: "OTHER", closeDate: "2026-04-17", resources: "Andy C,Aaron Lewis,Mike Hicks", notes: "" },
  { company: "SPN", name: "Old Inns", contact: "tbc", source: "OTHER", closeDate: "2026-07-17", resources: "Steven G,Sean M,Extra scottish", notes: "" },
]

async function main() {
  console.log("Seeding CRM data...")

  // Get unique company names
  const companyNames = [...new Set(opportunities.map((o) => o.company))]

  // Find or create customers and prospects for each company
  const companyMap: Record<string, { customerId: string; prospectId: string }> = {}

  for (const companyName of companyNames) {
    // Find or create Customer
    let customer = await prisma.customer.findFirst({
      where: { name: companyName },
    })
    if (!customer) {
      customer = await prisma.customer.create({
        data: { name: companyName },
      })
      console.log(`  Created customer: ${companyName}`)
    } else {
      console.log(`  Found existing customer: ${companyName}`)
    }

    // Find or create Prospect (linked to Customer)
    let prospect = await prisma.prospect.findFirst({
      where: { companyName },
    })
    if (!prospect) {
      prospect = await prisma.prospect.create({
        data: {
          companyName,
          source: "OTHER",
          status: "ACTIVE",
          convertedCustomerId: customer.id,
        },
      })
      console.log(`  Created prospect: ${companyName}`)
    } else {
      // Ensure it's linked to the customer
      if (!prospect.convertedCustomerId) {
        await prisma.prospect.update({
          where: { id: prospect.id },
          data: { convertedCustomerId: customer.id },
        })
      }
      console.log(`  Found existing prospect: ${companyName}`)
    }

    companyMap[companyName] = {
      customerId: customer.id,
      prospectId: prospect.id,
    }
  }

  // Get the last project number
  const lastProject = await prisma.project.findFirst({
    orderBy: { projectNumber: "desc" },
    select: { projectNumber: true },
  })
  let nextNumber = 100001
  if (lastProject) {
    const lastNum = parseInt(lastProject.projectNumber, 10)
    if (!isNaN(lastNum)) {
      nextNumber = lastNum + 1
    }
  }

  // Create opportunities and corresponding projects
  for (let i = 0; i < opportunities.length; i++) {
    const opp = opportunities[i]
    const { customerId, prospectId } = companyMap[opp.company]

    // Check if opportunity already exists (by name + prospect)
    const existingOpp = await prisma.opportunity.findFirst({
      where: { name: opp.name, prospectId },
    })
    if (existingOpp) {
      console.log(`  Skipping existing opportunity: ${opp.name}`)
      continue
    }

    // Create the project first
    const projectNumber = String(nextNumber + i)
    const project = await prisma.project.create({
      data: {
        projectNumber,
        name: opp.name,
        customerId,
        projectStatus: "OPPORTUNITY",
        salesStage: "OPPORTUNITY",
        lifecycleStage: "P0",
        enquiryReceived: new Date(),
        targetCompletion: new Date(opp.closeDate),
        notes: [
          opp.resources !== "tbc" ? `Resources: ${opp.resources}` : "",
          opp.notes,
        ]
          .filter(Boolean)
          .join("\n") || null,
      },
    })
    console.log(`  Created project: ${projectNumber} - ${opp.name}`)

    // Create the opportunity linked to the project
    const opportunity = await prisma.opportunity.create({
      data: {
        prospectId,
        name: opp.name,
        contactPerson: opp.contact,
        leadSource: opp.source as LeadSource,
        status: "ACTIVE_LEAD",
        expectedCloseDate: new Date(opp.closeDate),
        sortOrder: i,
        convertedProjectId: project.id,
        notes: [
          opp.resources !== "tbc" ? `Resources: ${opp.resources}` : "",
          opp.notes,
        ]
          .filter(Boolean)
          .join("\n") || null,
      },
    })
    console.log(`  Created opportunity: ${opp.name} (linked to project ${projectNumber})`)
  }

  console.log("\nDone! CRM data seeded successfully.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
