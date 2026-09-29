import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

export async function proxy(req: Request) {
  const url = new URL(req.url)
  const pathname = url.pathname
  
  const publicPaths = ["/auth/signin", "/auth/error", "/auth/register", "/departments"]
  // "/" must be matched exactly: a startsWith("/") test would treat every
  // route as public and silently disable the auth redirect.
  const isPublic = pathname === "/" || publicPaths.some(path => pathname.startsWith(path))
  const isApi = pathname.startsWith("/api/")
  const isApiAuth = pathname.startsWith("/api/auth")

  if (isApiAuth) {
    return NextResponse.next()
  }

  // Auth.js names the session cookie from the request protocol, not from
  // NODE_ENV: it prefixes the name with `__Secure-` only over HTTPS. Deriving
  // this from the protocol keeps `getToken` and the cookie in agreement, so
  // `next start` over plain HTTP (local pre-deploy checks) stays logged in.
  const forwardedProto = req.headers.get("x-forwarded-proto")
  const isHttps = url.protocol === "https:" || forwardedProto?.split(",")[0].trim() === "https"

  const token = await getToken({ 
    req, 
    secret: process.env.AUTH_SECRET,
    secureCookie: isHttps
  })
  
  const isLoggedIn = !!token
  
  // API routes answer with a 401 JSON body via their own authz guard rather
  // than an HTML redirect, so they are never intercepted here.
  if (isApi) {
    return NextResponse.next()
  }

  if (!isLoggedIn && !isPublic) {
    const signInUrl = new URL("/auth/signin", url.origin)
    signInUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(signInUrl)
  }
  
  if (isLoggedIn && pathname.startsWith("/auth")) {
    const role = (token.role as string)?.toLowerCase() || "patient"
    const portalUrl = new URL(`/portal/${role}`, url.origin)
    return NextResponse.redirect(portalUrl)
  }
  
  if (isLoggedIn && pathname.startsWith("/portal")) {
    const role = ((token.role as string) || "PATIENT").toLowerCase()
    const allowedPaths: Record<string, string[]> = {
      patient: ["/portal/patient"],
      doctor: ["/portal/doctor", "/portal/nurse"],
      nurse: ["/portal/nurse", "/portal/doctor"],
      admin: ["/portal/admin"],
    }
    
    const allowed = allowedPaths[role] || []
    const hasAccess = allowed.some(path => pathname.startsWith(path))
    
    if (!hasAccess) {
      const redirectUrl = new URL(`/portal/${role}`, url.origin)
      return NextResponse.redirect(redirectUrl)
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.webp$).*)",
  ],
}