import { prisma } from "@/lib/db"

type AuditEntry = {
  userId?: string | null
  userName?: string | null
  action: "CREATE" | "UPDATE" | "DELETE"
  entity: string
  entityId: string
  field?: string
  oldValue?: string | null
  newValue?: string | null
  metadata?: string
}

export async function logAudit(entry: AuditEntry) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId || null,
        userName: entry.userName || null,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        field: entry.field || null,
        oldValue: entry.oldValue || null,
        newValue: entry.newValue || null,
        metadata: entry.metadata || null,
      },
    })
  } catch {
    // Don't let audit logging failures break the main operation
    console.error("Audit log failed:", entry)
  }
}

export async function logChanges(
  userId: string | null,
  userName: string | null,
  entity: string,
  entityId: string,
  oldData: Record<string, unknown>,
  newData: Record<string, unknown>,
) {
  const changes: AuditEntry[] = []
  for (const key of Object.keys(newData)) {
    const oldVal = oldData[key]
    const newVal = newData[key]
    if (String(oldVal) !== String(newVal)) {
      changes.push({
        userId,
        userName,
        action: "UPDATE",
        entity,
        entityId,
        field: key,
        oldValue: oldVal != null ? String(oldVal) : null,
        newValue: newVal != null ? String(newVal) : null,
      })
    }
  }
  if (changes.length > 0) {
    await prisma.auditLog.createMany({ data: changes })
  }
}
