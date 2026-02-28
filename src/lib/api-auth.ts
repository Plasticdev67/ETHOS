import { auth } from "@/lib/auth"
import { hasPermission, type Permission } from "@/lib/permissions"
import { NextResponse } from "next/server"

type SessionUser = {
  id: string
  name?: string | null
  email?: string | null
  role?: string
  department?: string | null
}

/**
 * Require an authenticated session. Returns the session user if valid,
 * or a 401 NextResponse if not authenticated.
 * Middleware already blocks unauthenticated requests, but this provides
 * a defense-in-depth check and gives routes access to user identity.
 */
export async function requireAuth(): Promise<SessionUser | NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    )
  }
  return session.user as SessionUser
}

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
