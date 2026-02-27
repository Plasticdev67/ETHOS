import { auth } from "@/lib/auth"
import { hasPermission, type Permission } from "@/lib/permissions"
import { NextResponse } from "next/server"

/** Get the current user's role from the session. Returns "STAFF" if no session. */
export async function getUserRole(): Promise<string> {
  const session = await auth()
  return (session?.user as { role?: string } | undefined)?.role || "STAFF"
}

/**
 * Check if the current user has the required permission.
 * Returns null if authorized, or a 403 NextResponse if not.
 */
export async function requirePermission(permission: Permission): Promise<NextResponse | null> {
  const role = await getUserRole()
  if (!hasPermission(role, permission)) {
    return NextResponse.json(
      { error: "You do not have permission to perform this action" },
      { status: 403 }
    )
  }
  return null
}
