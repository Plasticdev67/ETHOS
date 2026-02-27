import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  const { hash } = await import("bcryptjs")
  const passwordHash = await hash("password123", 10)

  const user = await prisma.user.upsert({
    where: { email: "sales@mme.co.uk" },
    update: { role: "SALES_DIRECTOR", passwordHash, name: "Sales Director" },
    create: {
      name: "Sales Director",
      email: "sales@mme.co.uk",
      passwordHash,
      role: "SALES_DIRECTOR",
    },
  })

  return NextResponse.json({ ok: true, name: user.name, email: user.email, role: user.role })
}
