"use client"

import { ReactNode, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  LayoutDashboard, Calendar, FileText, Users, Settings, LogOut, 
  Menu, X, ChevronDown, Heart, Stethoscope, Shield,
  Bed, FlaskConical, Pill, Package, ClipboardList, Activity, Receipt,
  ClipboardCheck, TrendingUp, Wrench, MessageSquare, BarChart3, UserCog, type LucideIcon
} from "lucide-react"
import { PortalTools } from "@/components/portal/PortalTools"
import { cn } from "@/lib/utils"

const navigation = {
  patient: [
    { href: "/portal/patient", label: "Dashboard", icon: LayoutDashboard },
    { href: "/portal/patient/appointments", label: "Appointments", icon: Calendar },
    { href: "/portal/patient/records", label: "Health Records", icon: FileText },
    { href: "/portal/patient/results", label: "Test Results", icon: BarChart3 },
    { href: "/portal/patient/medications", label: "Medications", icon: Pill },
    { href: "/portal/patient/messages", label: "Messages", icon: MessageSquare },
    { href: "/portal/patient/billing", label: "Billing & Insurance", icon: Receipt },
    { href: "/portal/patient/settings", label: "Settings", icon: Settings },
  ],
  doctor: [
    { href: "/portal/doctor", label: "Dashboard", icon: LayoutDashboard },
    { href: "/portal/doctor/schedule", label: "Schedule", icon: Calendar },
    { href: "/portal/doctor/patients", label: "My Patients", icon: Users },
    { href: "/portal/doctor/ehr", label: "EHR & Charting", icon: FileText },
    { href: "/portal/doctor/prescriptions", label: "Prescriptions", icon: Pill },
    { href: "/portal/doctor/messages", label: "Messages", icon: MessageSquare },
    { href: "/portal/doctor/settings", label: "Settings", icon: Settings },
  ],
  nurse: [
    { href: "/portal/nurse", label: "Dashboard", icon: LayoutDashboard },
    { href: "/portal/nurse/patients", label: "My Patients", icon: Users },
    { href: "/portal/nurse/medications", label: "Medication Record", icon: Pill },
    { href: "/portal/nurse/vitals", label: "Vitals & Observations", icon: Activity },
    { href: "/portal/nurse/notes", label: "Nursing Notes", icon: ClipboardList },
    { href: "/portal/nurse/handoff", label: "Shift Handoff", icon: ClipboardCheck },
    { href: "/portal/nurse/settings", label: "Settings", icon: Settings },
  ],
  admin: [
    { href: "/portal/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/portal/admin/billing", label: "Billing & Claims", icon: Receipt },
    { href: "/portal/admin/wards", label: "Ward & Beds", icon: Bed },
    { href: "/portal/admin/laboratory", label: "Laboratory", icon: FlaskConical },
    { href: "/portal/admin/pharmacy", label: "Pharmacy", icon: Pill },
    { href: "/portal/admin/inventory", label: "Inventory", icon: Package },
    { href: "/portal/admin/equipment", label: "Equipment", icon: Wrench },
    { href: "/portal/admin/hr", label: "Staff & HR", icon: UserCog },
    { href: "/portal/admin/compliance", label: "Compliance", icon: Shield },
    { href: "/portal/admin/reports", label: "Reports", icon: TrendingUp },
    { href: "/portal/admin/settings", label: "Settings", icon: Settings },
  ],
}

const roleConfig: Record<
  PortalRole,
  { label: string; icon: LucideIcon; color: BadgeVariant; badge: string }
> = {
  patient: { label: "Patient Portal", icon: Heart, color: "sage", badge: "Patient" },
  doctor: { label: "Physician Portal", icon: Stethoscope, color: "coral", badge: "Dr." },
  nurse: { label: "Nursing Portal", icon: Heart, color: "gold", badge: "RN" },
  admin: { label: "Admin Portal", icon: Shield, color: "sage", badge: "Admin" },
}

type PortalRole = "patient" | "doctor" | "nurse" | "admin"
type BadgeVariant = "sage" | "coral" | "gold" | "clay" | "default"

interface PortalLayoutProps {
  children: ReactNode
  role: "patient" | "doctor" | "nurse" | "admin"
}

export function PortalLayout({ children, role }: PortalLayoutProps) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/auth/signin?callbackUrl=${encodeURIComponent(pathname)}`)
    }
  }, [status, router, pathname])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const navItems = navigation[role]
  const config = roleConfig[role]
  const userName = session?.user?.name || "User"
  const userInitials = userName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
  const darkNav = role === "admin"
  const mark =
    role === "patient"
      ? "bg-gradient-to-br from-[#1C6F8F] to-[#4FA6C1] shadow-[#1C6F8F]/30"
      : role === "admin"
        ? "bg-gradient-to-br from-[#123749] to-[#4F7691] shadow-[#123749]/30"
        : "bg-gradient-to-br from-[#1C7794] to-[#8BC5D7] shadow-[#1C7794]/30"

  if (status === "loading" || !session) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-sage-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F8FA] text-[#16283A] flex">
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-64",
          darkNav ? "bg-[#16283A] text-white" : "bg-white border-r border-[#D9EDF3]",
          "transform transition-transform duration-300 ease-out",
          "flex flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        aria-label="Main navigation"
      >
        <div className={cn("flex items-center justify-between px-5 pt-6 pb-2", darkNav && "text-white")}>
          <Link href={`/portal/${role}`} className="flex items-center gap-3">
            <span className={cn("w-10 h-10 rounded-[var(--r-btn)] flex items-center justify-center text-white", mark)}>
              <config.icon className="w-5 h-5" />
            </span>
            <span className="leading-tight">
              <span className={cn("block font-semibold text-sm", darkNav ? "text-white" : "text-[#16283A]")}>
                Meridian Health
              </span>
              <span className={cn("block text-xs font-medium", darkNav ? "text-white/60" : role === "patient" ? "text-[#1C6F8F]" : "text-[#1C7794]")}>
                {config.label}
              </span>
            </span>
          </Link>
          <button
            className={cn("lg:hidden p-2 rounded-lg transition-colors", darkNav ? "hover:bg-white/10" : "hover:bg-[#EDF3F7]")}
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <X className={cn("w-5 h-5", darkNav ? "text-white" : "text-[#52687A]")} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto" aria-label="Portal navigation">
          {navItems.map((item) => {
            const isDashboard = item.href === `/portal/${role}`
            const isActive = isDashboard
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-[var(--r-md)] text-sm font-medium transition-colors",
                  "focus:outline-none focus:ring-2 focus-visible:ring-[#1C7794] focus:ring-offset-2",
                  darkNav
                    ? isActive
                      ? "bg-white/15 text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                    : isActive
                      ? "bg-[#EDF3F7] text-[#16283A]"
                      : "text-[#52687A] hover:bg-[#EDF3F7]"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className={cn("p-4 border-t", darkNav ? "border-white/10" : "border-[#D9EDF3]")}>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-2.5 rounded-[var(--r-md)] text-sm transition-colors",
              darkNav ? "text-white/70 hover:bg-white/10" : "text-[#52687A] hover:bg-[#EDF3F7]"
            )}
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        <header className="sticky top-0 z-30 border-b border-[#DCE7EE] bg-white">
          <div className="flex items-center justify-between h-16 px-4 lg:px-8">
            <button
              className="lg:hidden p-2 rounded-xl hover:bg-[#EDF3F7] transition-colors"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu className="w-6 h-6 text-[#52687A]" />
            </button>

            <div className="flex-1 lg:flex-none" />

            <div className="flex items-center gap-3">
              <PortalTools />

              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-3 px-3 py-1.5 rounded-[var(--r-btn)] border border-[#DCE7EE] bg-white transition-colors hover:bg-[#EDF3F7]"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                >
                  <div className="w-8 h-8 rounded-full bg-[#EDF3F7] flex items-center justify-center">
                    <span className="text-sm font-semibold text-[#1C6F8F]">{userInitials}</span>
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-[#16283A]">{userName}</span>
                  <ChevronDown className="w-4 h-4 text-clay-500" />
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute right-0 mt-2 w-56 bg-white rounded-[var(--r-md)] border border-[#DCE7EE] shadow-card py-2 z-50"
                      role="menu"
                    >
                      <Link
                        href={`/portal/${role}/settings`}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-clay-700 hover:bg-cream-100"
                        role="menuitem"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </Link>
                      <hr className="my-2 border-cream-200" />
                      <button
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-clay-700 hover:bg-cream-100 w-full text-left"
                        role="menuitem"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 lg:px-8 lg:py-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}