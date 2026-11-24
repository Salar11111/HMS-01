"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useState } from "react"
import {
  ArrowRight,
  Calendar,
  Clock,
  FileText,
  HeartPulse,
  Lock,
  Receipt,
  Shield,
  Star,
  Stethoscope,
  Users,
} from "lucide-react"
import { PortalTransition } from "@/components/ui/PortalTransition"
import { slugify } from "@/lib/utils"

const services = [
  { icon: Calendar, title: "Appointment Booking", desc: "Schedule visits with specialists in seconds, anytime." },
  { icon: FileText, title: "Electronic Health Records", desc: "Secure, unified patient charts accessible to your care team." },
  { icon: Stethoscope, title: "Lab & Test Results", desc: "View results the moment they're ready, with clear explanations." },
  { icon: Receipt, title: "Billing & Insurance", desc: "Transparent invoices and seamless insurance processing." },
]

const stats = [
  { icon: Users, value: "120K+", label: "Patients Served" },
  { icon: Stethoscope, value: "480+", label: "Specialist Doctors" },
  { icon: Clock, value: "24/7", label: "Emergency Care" },
  { icon: Star, value: "4.9", label: "Patient Rating" },
]

const departments = [
  { name: "Cardiology", desc: "Heart & vascular care" },
  { name: "Neurology", desc: "Brain & nervous system" },
  { name: "Orthopedics", desc: "Bones, joints & spine" },
  { name: "Oncology", desc: "Cancer treatment & support" },
  { name: "Pediatrics", desc: "Children's health" },
  { name: "Emergency", desc: "24/7 trauma center" },
  { name: "Women's Health", desc: "OB/GYN & maternity" },
  { name: "Mental Health", desc: "Psychiatry & counseling" },
]

export default function LandingPage() {
  const [portalOpen, setPortalOpen] = useState(false)
  const router = useRouter()

  const finishEnter = useCallback(() => {
    router.push("/auth/signin?mode=portal")
  }, [router])

  const handleEnterPortal = () => {
    if (portalOpen) return
    setPortalOpen(true)
  }

  return (
    <div className="min-h-screen bg-[#F5F8FA] text-[#16283A] overflow-hidden relative">
      <PortalTransition isOpen={portalOpen} onComplete={finishEnter} />

      <nav className="relative z-10 max-w-7xl mx-auto px-4 py-5 sm:px-6 lg:px-10 lg:py-6 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 sm:gap-3 shrink-0">
          <span className="w-10 h-10 sm:w-11 sm:h-11 rounded-[var(--r-btn)] bg-[#1C7794] flex items-center justify-center text-white shrink-0">
            <HeartPulse className="w-5 h-5 sm:w-6 sm:h-6" />
          </span>
          <span className="leading-tight">
            <span className="block font-semibold text-base sm:text-lg tracking-tight whitespace-nowrap">Meridian Health</span>
            <span className="hidden sm:block text-xs text-[#1C7794] font-medium">Hospital Management</span>
          </span>
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#52687A]">
          <a href="#services" className="hover:text-[#16283A] transition-colors">Services</a>
          <a href="#departments" className="hover:text-[#16283A] transition-colors">Departments</a>
          <a href="#about" className="hover:text-[#16283A] transition-colors">Why Us</a>
        </div>
        <button
          type="button"
          onClick={handleEnterPortal}
          disabled={portalOpen}
          className="inline-flex items-center gap-2 clay-button px-5 bg-[#16283A] text-white text-sm font-semibold hover:bg-[#175F79] disabled:pointer-events-none"
        >
          Enter Portal
          <ArrowRight className="w-4 h-4" />
        </button>
      </nav>

      <main>
        <section className="max-w-7xl mx-auto px-6 lg:px-10 pt-8 pb-6 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D9EDF3] text-[#52687A] text-xs font-semibold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-[#1C7794]" />
              Empathetic care, reimagined
            </span>
            <h1 className="mt-6 text-5xl md:text-6xl font-semibold tracking-tight leading-[1.05] text-balance">
              Your health, in <span className="text-[#1C7794]">caring</span> hands.
            </h1>
            <p className="mt-5 text-lg text-[#52687A] max-w-md leading-relaxed">
              A calm, connected hospital experience for patients, clinicians, and administrators — all behind one gentle doorway.
            </p>
            <button
              type="button"
              onClick={handleEnterPortal}
              disabled={portalOpen}
              className="group mt-10 inline-flex items-center gap-3 clay-button px-8 bg-[#1C7794] text-white text-base font-semibold disabled:pointer-events-none"
            >
              <span className="relative flex items-center justify-center w-6 h-6">
                <span className="absolute inset-0 rounded-full border-2 border-white/60 group-hover:scale-110 transition-transform" />
                <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-0.5 transition-transform" />
              </span>
              Enter the Portal
            </button>
            <div className="mt-6 flex items-center gap-5 text-sm text-[#52687A]">
              <span className="inline-flex items-center gap-1.5"><Lock className="w-4 h-4" /> HIPAA-secure</span>
              <span className="inline-flex items-center gap-1.5"><Clock className="w-4 h-4" /> 24/7 access</span>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-[var(--r-lg)] bg-white p-3 shadow-card">
              <div className="relative h-[340px] rounded-[1.5rem] overflow-hidden bg-gradient-to-br from-[#D9EDF3] via-[#EDF3F7] to-[#cfe4ec]">
                <div className="absolute inset-0 flex items-end p-8">
                  <div>
                    <p className="text-sm font-medium text-[#52687A]">Care team, on the ward</p>
                    <p className="text-2xl font-semibold tracking-tight mt-1">A quieter way to run a hospital.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -top-4 left-8 bg-white rounded-2xl shadow-card px-4 py-3 flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-[#D9EDF3] flex items-center justify-center">
                <HeartPulse className="w-4 h-4 text-[#1C6F8F]" />
              </span>
              <span>
                <span className="block text-xs text-[#52687A]">Vitals stable</span>
                <span className="block text-sm font-semibold">98 bpm</span>
              </span>
            </div>
            <div className="absolute -bottom-4 right-6 bg-white rounded-2xl shadow-card px-4 py-3 flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-[#EDF3F7] flex items-center justify-center">
                <Calendar className="w-4 h-4 text-[#1C6F8F]" />
              </span>
              <span>
                <span className="block text-xs text-[#52687A]">Next visit</span>
                <span className="block text-sm font-semibold">Sep 19, 10:30</span>
              </span>
            </div>
          </div>
        </section>

        <section id="stats" className="max-w-7xl mx-auto px-6 lg:px-10 py-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-[var(--r-lg)] p-6 border border-[#D9EDF3]">
              <span className="w-10 h-10 rounded-2xl bg-[#D9EDF3] flex items-center justify-center mb-4 text-[#1C6F8F]">
                <stat.icon className="w-5 h-5" />
              </span>
              <p className="text-3xl font-semibold tracking-tight">{stat.value}</p>
              <p className="text-sm text-[#52687A] mt-1">{stat.label}</p>
            </div>
          ))}
        </section>

        <section id="services" className="max-w-7xl mx-auto px-6 lg:px-10 py-8">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Everything under one calm roof</h2>
            <p className="mt-3 text-[#52687A]">From booking to billing, every step is designed to feel human.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {services.map((service) => (
              <div key={service.title} className="bg-white rounded-[var(--r-lg)] p-6 border border-[#D9EDF3] shadow-sm">
                <span className="w-10 h-10 rounded-2xl bg-[#D9EDF3] flex items-center justify-center mb-4 text-[#1C6F8F]">
                  <service.icon className="w-5 h-5" />
                </span>
                <h3 className="font-semibold">{service.title}</h3>
                <p className="mt-2 text-sm text-[#52687A] leading-relaxed">{service.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="departments" className="max-w-7xl mx-auto px-6 lg:px-10 py-16">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Our specialties</h2>
            <p className="mt-3 text-[#52687A]">Comprehensive care, one shared record.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {departments.map((dept) => (
              <Link
                key={dept.name}
                href={`/departments/${slugify(dept.name)}`}
                className="bg-white rounded-[var(--r-lg)] p-5 border border-[#D9EDF3] hover:border-[#8BC5D7] transition-colors"
              >
                <h3 className="font-semibold">{dept.name}</h3>
                <p className="mt-1 text-sm text-[#52687A]">{dept.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        <section id="about" className="max-w-5xl mx-auto px-6 lg:px-10 pb-20">
          <div className="relative rounded-[var(--r-lg)] bg-white p-10 md:p-14 text-center overflow-hidden border border-[#D9EDF3]">
            <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-[#1C7794]/15 blur-3xl" />
            <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-[#1C6F8F]/15 blur-3xl" />
            <div className="relative">
              <Shield className="w-8 h-8 mx-auto text-[#1C7794]" />
              <h2 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight">Step through the doorway to better care</h2>
              <p className="mt-3 text-[#52687A] max-w-lg mx-auto">
                One portal for patients, clinicians, and administrators. Open the door and begin.
              </p>
              <button
                type="button"
                onClick={handleEnterPortal}
                disabled={portalOpen}
                className="mt-8 inline-flex items-center gap-2 clay-button px-6 bg-[#16283A] text-white text-sm font-semibold hover:bg-[#175F79] disabled:pointer-events-none"
              >
                Enter the Portal
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="max-w-7xl mx-auto px-6 lg:px-10 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-[#52687A]">
        <p>Meridian Health — Empathetic care, always.</p>
        <p>© {new Date().getFullYear()} Meridian Health. All rights reserved.</p>
      </footer>
    </div>
  )
}
