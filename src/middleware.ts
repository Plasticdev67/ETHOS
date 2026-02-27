import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow auth API routes, portal routes, and static files always
  if (pathname.startsWith("/api/auth") || pathname.startsWith("/portal")) {
    return NextResponse.next()
  }

  // Skip token verification for internal API routes — they run server-side
  // and can check auth themselves if needed. This avoids JWT decode on every fetch.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next()
  }

  // NextAuth v5 uses "authjs" cookie prefix (not "next-auth")
  const secureCookie = req.nextUrl.protocol === "https:"
  const cookieName = secureCookie
    ? "__Secure-authjs.session-token"
    : "authjs.session-token"
  const token = await getToken({ req, secret: process.env.AUTH_SECRET, cookieName })
  const isLoggedIn = !!token
  const isLoginPage = pathname === "/login"

  // Redirect logged-in users away from login page
  if (isLoginPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  // Redirect unauthenticated users to login
  if (!isLoginPage && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Only run middleware on page routes (not API, static, image, or public asset routes)
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:jpg|jpeg|png|gif|svg|ico|webp|mp4|css|js)$).*)",
  ],
}
