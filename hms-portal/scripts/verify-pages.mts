/**
 * Checks dashboard page access against the real rules.
 *
 * Pages and API endpoints use different matrices on purpose: a doctor may open
 * the nurse dashboard (shared ward view) but may not read the nurse data
 * endpoint. `src/proxy.ts` owns the page matrix; the API routes own the data
 * matrix, which `verify-portal.mts` covers.
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3111"

const ROLES = ["patient", "doctor", "nurse", "admin"] as const
type Role = (typeof ROLES)[number]

const EMAILS: Record<Role, string> = {
  patient: "patient@demo.com",
  doctor: "doctor@demo.com",
  nurse: "nurse@demo.com",
  admin: "admin@demo.com",
}

const PAGE_ACCESS: Record<Role, Role[]> = {
  patient: ["patient"],
  doctor: ["doctor", "nurse"],
  nurse: ["nurse", "doctor"],
  admin: ["admin"],
}

type CookieJar = Map<string, string>

function storeCookies(jar: CookieJar, res: Response) {
  for (const line of res.headers.getSetCookie?.() ?? []) {
    const [pair] = line.split(";")
    const idx = pair.indexOf("=")
    if (idx > 0) jar.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim())
  }
}

function cookieHeader(jar: CookieJar) {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ")
}

async function login(email: string) {
  const jar: CookieJar = new Map()
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`)
  storeCookies(jar, csrfRes)
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string }
  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie: cookieHeader(jar) },
    body: new URLSearchParams({ csrfToken, email, password: "demo123", callbackUrl: `${BASE}/portal` }),
    redirect: "manual",
  })
  storeCookies(jar, res)
  if (!jar.has("authjs.session-token")) throw new Error(`login failed for ${email}`)
  return jar
}

let failures = 0
const check = (ok: boolean, message: string) => {
  if (!ok) failures++
  console.log(`${ok ? "OK  " : "FAIL"} ${message}`)
}

for (const role of ROLES) {
  const jar = await login(EMAILS[role])
  const allowed = PAGE_ACCESS[role]

  for (const target of ROLES) {
    const res = await fetch(`${BASE}/portal/${target}`, {
      headers: { cookie: cookieHeader(jar) },
      redirect: "manual",
    })

    if (allowed.includes(target)) {
      if (res.status !== 200) {
        check(false, `${role} -> /portal/${target} -> ${res.status} (expected 200)`)
        continue
      }
      const html = await res.text()
      // PortalLayout resolves auth on the client, so a healthy response is the
      // spinner shell rather than dashboard markup.
      const hasShell = html.includes("animate-spin")
      const hasError = /Application error|Unhandled Runtime Error/i.test(html)
      check(
        hasShell && !hasError,
        `${role} -> /portal/${target} -> 200 shell=${hasShell} error=${hasError}`
      )
    } else {
      // Blocked roles are redirected back to their own dashboard.
      const redirected = res.status >= 300 && res.status < 400
      check(
        redirected,
        `${role} -> /portal/${target} -> ${res.status} (expected redirect, want blocked)`
      )
    }
  }
}

console.log(failures === 0 ? "\nAll page checks passed." : `\n${failures} page check(s) failed.`)
process.exit(failures === 0 ? 0 : 1)
