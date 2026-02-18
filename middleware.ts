import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

const protectedPaths = [
  "/dashboard",
  "/accounts",
  "/transactions",
  "/cards",
  "/goals",
  "/investments",
  "/reports",
  "/settings",
  "/budget",
  "/documents",
  "/categorization",
  "/planning",
  "/export",
]

function isProtected(pathname: string): boolean {
  return protectedPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (!isProtected(pathname)) {
    return NextResponse.next()
  }
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })
  if (!token) {
    const login = new URL("/login", request.url)
    login.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(login)
  }
  return NextResponse.next()
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/accounts/:path*",
    "/transactions/:path*",
    "/cards/:path*",
    "/goals/:path*",
    "/investments/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/budget/:path*",
    "/documents/:path*",
    "/categorization/:path*",
    "/planning/:path*",
    "/export/:path*",
  ],
}
