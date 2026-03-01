import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { requireAuth, requirePermission } from "@/lib/api-auth"

export async function GET() {
  try {
    const user = await requireAuth()
    if (user instanceof NextResponse) return user

    const accounts = await prisma.account.findMany({
      orderBy: { code: "asc" },
      include: {
        _count: {
          select: { journalLines: true },
        },
      },
    })

    return NextResponse.json(accounts)
  } catch (error) {
    console.error("Accounts GET error:", error)
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    if (user instanceof NextResponse) return user
    const denied = await requirePermission("finance:edit")
    if (denied) return denied

    const body = await request.json()

    const {
      code,
      name,
      type,
      subType,
      normalBalance,
      parentId,
      vatCode,
      description,
      isSystemAccount,
    } = body

    if (!code || !name || !type || !normalBalance) {
      return NextResponse.json(
        { error: "code, name, type, and normalBalance are required" },
        { status: 400 }
      )
    }

    // Check for duplicate code
    const existing = await prisma.account.findUnique({ where: { code } })
    if (existing) {
      return NextResponse.json(
        { error: `Account code '${code}' already exists` },
        { status: 409 }
      )
    }

    const account = await prisma.account.create({
      data: {
        code,
        name,
        type,
        subType: subType || null,
        normalBalance,
        parentId: parentId || null,
        vatCode: vatCode || null,
        description: description || null,
        isSystemAccount: isSystemAccount ?? false,
      },
    })

    revalidatePath("/finance")
    return NextResponse.json(account, { status: 201 })
  } catch (error) {
    console.error("Account POST error:", error)
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    )
  }
}
