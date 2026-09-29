"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Heart, User, Stethoscope, Shield, Mail, Lock, Eye, EyeOff, ArrowRight, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Card, CardContent, CardFooter } from "@/components/ui/Card"

import { cn } from "@/lib/utils"

type Role = "PATIENT" | "DOCTOR" | "NURSE" | "ADMIN"
type BadgeVariant = "sage" | "coral" | "gold" | "clay" | "default"

const roles: {
  value: Role
  label: string
  desc: string
  icon: LucideIcon
  color: BadgeVariant
  href: string
}[] = [
  { 
    value: "PATIENT", 
    label: "Patient", 
    desc: "Book appointments, view results, message care team",
    icon: User,
    color: "sage",
    href: "/portal/patient"
  },
  { 
    value: "DOCTOR", 
    label: "Physician", 
    desc: "Manage EHR, view schedule, clinical charting",
    icon: Stethoscope,
    color: "coral",
    href: "/portal/doctor"
  },
  { 
    value: "NURSE", 
    label: "Nurse", 
    desc: "Patient charts, medication admin, shift handoffs",
    icon: Heart,
    color: "gold",
    href: "/portal/nurse"
  },
  { 
    value: "ADMIN", 
    label: "Administrator", 
    desc: "Billing, inventory, HR, compliance reporting",
    icon: Shield,
    color: "sage",
    href: "/portal/admin"
  },
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

  return (
    <div className="min-h-screen bg-[#FBF7F0] text-[#2F3E2E] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#7BA68C]/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-[#C99A6A]/15 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#7BA68C] to-[#A8C4A0] flex items-center justify-center text-white shadow-lg shadow-[#7BA68C]/30">
              <Heart className="w-6 h-6" />
            </span>
          </Link>
          {mode === "portal" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAF0E6] text-[#5A6B57] text-sm font-medium mb-4"
            >
              <span className="w-2 h-2 rounded-full bg-[#7BA68C] animate-pulse" />
              Welcome to the Portal
            </motion.div>
          )}
          <h1 className="text-3xl font-semibold tracking-tight text-[#2F3E2E] mb-2">
            {mode === "portal" ? "Welcome back" : "Sign in to Meridian Health"}
          </h1>
          <p className="text-[#5A6B57]">
            {mode === "portal" 
              ? "Select your role and sign in to access your dashboard"
              : "Access your personalized healthcare experience"}
          </p>
        </div>

        <Card variant="elevated" padding="lg">
          <CardContent className="space-y-6">
            <div role="group" aria-label="Select your role">
              <div className="grid grid-cols-2 gap-3 mb-2">
                {roles.map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => setSelectedRole(role.value)}
                    className={cn(
                      "relative p-4 rounded-2xl transition-all duration-200 text-left border",
                      "focus:outline-none focus:ring-2 focus:ring-[#7BA68C] focus:ring-offset-2",
                      selectedRole === role.value
                        ? "border-[#7BA68C] bg-[#EAF0E6]/60"
                        : "border-[#EAF0E6] bg-white hover:bg-[#FBF7F0]"
                    )}
                    aria-pressed={selectedRole === role.value}
                  >
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        selectedRole === role.value 
                          ? "bg-[#2F3E2E] text-white"
                          : "bg-[#F3EDE2] text-[#5A6B57]"
                      )}>
                        <role.icon className="w-5 h-5" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={cn("font-medium text-sm truncate", selectedRole === role.value ? "text-[#2F3E2E]" : "text-[#5A6B57]")}>
                          {role.label}
                        </p>
                        <p className="text-xs truncate text-[#5A6B57]">
                          {role.desc}
                        </p>
                      </div>
                    </div>
                    {selectedRole === role.value && (
                      <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#7BA68C] text-white flex items-center justify-center">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@meridianhealth.org"
                autoComplete="email"
                required
                error={error && !email ? "Email is required" : undefined}
                icon={<Mail className="w-5 h-5" />}
              />
              
              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  error={error && !password ? "Password is required" : undefined}
                  icon={<Lock className="w-5 h-5" />}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-[38px] text-clay-500 hover:text-clay-700 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl bg-[color-mix(in_srgb,_var(--accent-coral)_15%,_transparent)] text-[var(--accent-coral)] text-sm flex items-center gap-2"
                  role="alert"
                >
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {error}
                </motion.div>
              )}

              <Button 
                type="submit" 
                className="w-full py-3 text-lg"
                loading={isLoading}
              >
                Sign In
                <ArrowRight className="w-5 h-5" />
              </Button>
            </form>

            <CardFooter className="pt-6 border-t border-[#EAF0E6] flex-col items-stretch">
              <p className="text-center text-sm text-[#5A6B57]">Or try a demo account</p>
              <p className="text-center text-xs text-[#5A6B57]">
                Every record in this demonstration is fictional. Do not enter real patient information.
              </p>
              <div className="flex flex-col gap-2 w-full">
                {demoAccounts
                  .filter(d => d.role === selectedRole)
                  .map((account) => (
                    <button
                      key={account.email}
                      type="button"
                      onClick={() => handleDemoLogin(account)}
                      disabled={isLoading}
                      className="clay-button-secondary w-full py-2.5 px-4 text-sm gap-2"
                    >
                      <User className="w-4 h-4" />
                      <span className="truncate">{account.name}</span>
                    </button>
                  ))}
              </div>
            </CardFooter>
          </CardContent>
        </Card>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 text-center text-sm text-clay-500"
        >
          Don&rsquo;t have an account?{" "}
          <Link href="/auth/register" className="text-sage-600 hover:text-sage-700 font-medium">
            Create one
          </Link>
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 p-4 rounded-2xl bg-cream-100 clay-card-inset"
        >
          <h4 className="font-medium text-clay-900 mb-3 flex items-center gap-2">
            <Shield className="w-5 h-5 text-sage-600" />
            Security Notice
          </h4>
          <ul className="text-sm text-clay-600 space-y-1">
            <li>• Never share your credentials with anyone</li>
            <li>• Meridian Health will never ask for your password via email</li>
            <li>• Always sign out on shared devices</li>
            <li>• Report suspicious activity to security@meridianhealth.org</li>
          </ul>
        </motion.div>
      </motion.div>
    </div>
  )
}