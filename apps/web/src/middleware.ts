import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const publicPaths = ["/login", "/_next", "/favicon.ico"]

function isPublicPath(pathname: string) {
  return publicPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (isPublicPath(pathname)) {
    if (pathname === "/login" || pathname.startsWith("/login/")) {
      const token = req.cookies.get("nalarxr_access_token")?.value
      if (token) {
        const url = req.nextUrl.clone()
        url.pathname = "/dashboard"
        return NextResponse.redirect(url)
      }
    }
    return NextResponse.next()
  }

  const token = req.cookies.get("nalarxr_access_token")?.value
  if (!token) {
    const url = req.nextUrl.clone()
    url.pathname = "/login"
    url.search = ""
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api).*)"],
}

