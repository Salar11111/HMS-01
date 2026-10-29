"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { Heart, User, Stethoscope, Shield, Mail, Lock, Eye, EyeOff, ArrowRight, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Card, CardContent } from "@/components/ui/Card"

import { cn } from "@/lib/utils"

type Role = "PATIENT" | "DOCTOR" | "NURSE" | "ADMIN"

const roles: {
  value: Role
  label: string
  desc: string
  icon: LucideIcon
}[] = [
  { value: "ADMIN", label: "Admin", desc: "Billing, inventory, and staff", icon: Shield },
  { value: "DOCTOR", label: "Doctor", desc: "Schedule, charting, and orders", icon: Stethoscope },
  { value: "NURSE", label: "Nurse", desc: "Census, medications, and handoff", icon: Heart },
  { value: "PATIENT", label: "Patient", desc: "Appointments, results, and messages", icon: User },
]

const demoAccounts = [
  { email: "patient@demo.com", password: "demo123", role: "PATIENT", name: "Sarah Johnson" },
  { email: "doctor@demo.com", password: "demo123", role: "DOCTOR", name: "Dr. Michael Chen" },
  { email: "nurse@demo.com", password: "demo123", role: "NURSE", name: "Emily Rodriguez" },
  { email: "admin@demo.com", password: "demo123", role: "ADMIN", name: "James Wilson" },
]

/**
 * Only same-origin paths are honoured, so a crafted ?callbackUrl cannot be
 * used to bounce a freshly authenticated user to another site.
 */
function safeCallbackUrl(raw: string | null, fallback: string) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return fallback
  return raw
}

export function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const mode = searchParams.get("mode")
  
  const [selectedRole, setSelectedRole] = useState<"PATIENT" | "DOCTOR" | "NURSE" | "ADMIN">(() => {
    const roleParam = searchParams.get("role")
    return roleParam && roles.some(r => r.value === roleParam)
      ? (roleParam as "PATIENT" | "DOCTOR" | "NURSE" | "ADMIN")
      : "PATIENT"
  })
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleDemoLogin = async (account: typeof demoAccounts[0]) => {
    setIsLoading(true)
    setError("")
    try {
      const result = await signIn("credentials", {
        email: account.email,
        password: account.password,
        role: account.role,
        redirect: false,
      })
      if (result?.error) {
        setError("Demo login failed. Please try again.")
      } else {
        const fallback = `/portal/${account.role.toLowerCase()}`
        router.push(safeCallbackUrl(searchParams.get("callbackUrl"), fallback))
        router.refresh()
      }
    } catch {
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    
    try {
      const result = await signIn("credentials", {
        email,
        password,
        role: selectedRole,
        redirect: false,
      })
      
      if (result?.error) {
        setError("Invalid credentials. Please check your email and password.")
      } else {
        const fallback = `/portal/${selectedRole.toLowerCase()}`
        router.push(safeCallbackUrl(searchParams.get("callbackUrl"), fallback))
        router.refresh()
      }
    } catch {
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const activeRole = roles.find(role => role.value === selectedRole) ?? roles[0]
  const demo = demoAccounts.find(account => account.role === selectedRole)

  return (
    <div className="min-h-screen bg-[#FBF7F0] text-[#2F3E2E] flex items-center justify-center px-4 py-8 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[#7BA68C]/20 blur-3xl" />
      </div>

      <div className="animate-rise relative z-10 w-full max-w-md">
        <Card variant="elevated" padding="sm" className="p-5 sm:p-6">
          <CardContent className="space-y-5">
            <div className="flex items-center gap-3">
              <Link href="/" aria-label="Meridian Health home" className="shrink-0">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7BA68C] to-[#A8C4A0] text-white">
                  <Heart className="h-5 w-5" />
                </span>
              </Link>
              <div className="min-w-0">
                <h1 className="text-xl font-semibold tracking-tight">
                  {mode === "portal" ? "Welcome back" : "Sign in"}
                </h1>
                <p className="text-sm text-[#5A6B57]">Meridian Health</p>
              </div>
            </div>

            <div role="group" aria-label="Select your role" className="space-y-2">
              <div className="grid grid-cols-4 gap-1 rounded-2xl bg-[#F3EDE2] p-1">
                {roles.map(role => {
                  const selected = selectedRole === role.value
                  return (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => setSelectedRole(role.value)}
                      className="relative rounded-xl px-1 py-2 text-[#5A6B57] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7BA68C]"
                      aria-pressed={selected}
                    >
                      {selected && (
                        <motion.span
                          layoutId="role-pill"
                          initial={false}
                          className="absolute inset-0 rounded-xl bg-white shadow-sm"
                          transition={{ type: "spring", stiffness: 460, damping: 34 }}
                        />
                      )}
                      <span className={cn("relative z-10 flex flex-col items-center gap-1", selected && "text-[#2F3E2E]")}>
                        <role.icon className="h-4 w-4" />
                        <span className="text-[11px] font-medium leading-none">{role.label}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
              <p key={activeRole.value} className="animate-swap text-center text-xs text-[#5A6B57]">
                {activeRole.desc}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@meridianhealth.org"
                autoComplete="email"
                required
                error={error && !email ? "Email is required" : undefined}
                icon={<Mail className="h-4 w-4" />}
              />
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                error={error && !password ? "Password is required" : undefined}
                icon={<Lock className="h-4 w-4" />}
                endAdornment={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-clay-500 transition-colors hover:text-clay-700"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden text-sm text-[var(--accent-coral)]"
                    role="alert"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <Button type="submit" className="w-full" loading={isLoading}>
                Sign in
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            {demo && (
              <button
                type="button"
                onClick={() => handleDemoLogin(demo)}
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-[#E8E0D2] bg-white px-4 py-2 text-sm font-medium text-[#2F3E2E] transition-colors hover:bg-[#FBF7F0] disabled:opacity-50"
              >
                <User className="h-4 w-4" />
                <span key={demo.email} className="animate-swap">
                  Continue as {demo.name}
                </span>
              </button>
            )}

            <p className="text-center text-xs leading-5 text-[#5A6B57]">
              Demo records are fictional. Sign out on shared devices — we never ask for your password by email.{" "}
              <Link href="/auth/register" className="font-medium text-[#3F6B4E] hover:underline">
                Create an account
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}