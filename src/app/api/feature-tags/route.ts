import { prisma } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  const tags = await prisma.featureTag.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  })

  return NextResponse.json(tags)
}
