import { config } from "dotenv"
config()

async function loadPrisma() {
  const pg = await import("pg")
  const adapterMod = await import("@prisma/adapter-pg")
  const mod = await import("../src/generated/prisma/client.js")

  const pool = new pg.default.Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new adapterMod.PrismaPg(pool)
  return { prisma: new mod.PrismaClient({ adapter }), pool }
}

async function main() {
  const { prisma, pool } = await loadPrisma()
  console.log("Updating project managers...")

  // Look up users
  const users = await prisma.user.findMany()
  const u = Object.fromEntries(users.map((u: any) => [u.name, u]))

  // PM assignments: projectNumber → PM name
  const pmAssignments: Record<string, string> = {
    "200710": "Richard Guest",
    "101485": "Corey Thomas",
    "200670": "James Morton",
    "200672": "Marc Pridmore",
    "200401": "Richard Guest",
    "101339": "Corey Thomas",
    "101328": "James Morton",
    "200598": "Richard Guest",
    "200615": "Corey Thomas",
  }

  for (const [projectNumber, pmName] of Object.entries(pmAssignments)) {
    const pm = u[pmName]
    if (!pm) {
      console.warn(`User "${pmName}" not found, skipping ${projectNumber}`)
      continue
    }

    const project = await prisma.project.findFirst({ where: { projectNumber } })
    if (!project) {
      console.warn(`Project ${projectNumber} not found, skipping`)
      continue
    }

    await prisma.project.update({
      where: { id: project.id },
      data: { projectManagerId: pm.id },
    })
    console.log(`  ${projectNumber} → PM: ${pmName}`)
  }

  console.log("Done!")
  await prisma.$disconnect()
  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
