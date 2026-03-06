import "dotenv/config"
import { prisma } from "../src/lib/db"

async function main() {
  const users = await prisma.user.findMany({
    where: { name: { contains: "James" } },
    select: { id: true, name: true, role: true, email: true },
  })
  for (const u of users) {
    console.log(`${u.name} — role: ${u.role} — email: ${u.email}`)
  }
  await prisma.$disconnect()
}
main()
