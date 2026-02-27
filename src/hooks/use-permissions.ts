"use client"

import { useSession } from "next-auth/react"
import { hasPermission, canEdit, type Permission } from "@/lib/permissions"

export function usePermissions() {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string } | undefined)?.role || "STAFF"
  const department = (session?.user as { department?: string | null } | undefined)?.department || null

  return {
    role,
    department,
    can: (permission: Permission) => hasPermission(role, permission),
    canEdit: () => canEdit(role),
    isAdmin: role === "ADMIN",
    userName: session?.user?.name || "User",
    userId: (session?.user as { id?: string } | undefined)?.id,
  }
}
