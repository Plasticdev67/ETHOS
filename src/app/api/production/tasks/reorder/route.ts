import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"
import { requirePermission } from "@/lib/api-auth"
import { revalidatePath } from "next/cache"

export async function POST(request: NextRequest) {
  const denied = await requirePermission("production:manage")
  if (denied) return denied

  const body = await request.json()
  const { taskIds } = body as { taskIds: string[] }

  if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
    return NextResponse.json(
      { error: "taskIds array is required" },
      { status: 400 }
    )
  }

  // Update queue positions in order
  const updates = taskIds.map((id, index) =>
    prisma.productionTask.update({
      where: { id },
      data: { queuePosition: index },
    })
  )

  await Promise.all(updates)

  revalidatePath("/production")
  revalidatePath("/production/dashboard")

  return NextResponse.json({ success: true, count: taskIds.length })
}
