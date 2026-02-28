import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

function getSessionToken(req: NextRequest) {
  const secureCookie = req.nextUrl.protocol === "https:"
  const cookieName = secureCookie
    ? "__Secure-authjs.session-token"
    : "authjs.session-token"
  return getToken({ req, secret: process.env.AUTH_SECRET, cookieName })
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Always allow NextAuth routes (login/callback/signout)
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next()
  }

  // Allow public portal pages (customer-facing, token-authenticated separately)
  if (pathname.startsWith("/portal")) {
    return NextResponse.next()
  }

  // Protect ALL other /api/ routes — require a valid session
  if (pathname.startsWith("/api/")) {
    const token = await getSessionToken(req)
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }
    return NextResponse.next()
  }

  // Page routes — check session
  const token = await getSessionToken(req)
  const isLoggedIn = !!token
  const isLoginPage = pathname === "/login"

  if (isLoginPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  if (!isLoginPage && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Run on page routes AND API routes (exclude static assets and NextAuth)
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|png|gif|svg|ico|webp|mp4|css|js|woff|woff2)$).*)",
  ],
}
