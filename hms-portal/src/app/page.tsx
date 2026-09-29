"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { motion } from "framer-motion"
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

  const handleEnterPortal = () => {
    setPortalOpen(true)
    setTimeout(() => {
      router.push("/auth/signin?mode=portal")
    }, 900)
  }

  return (
    <div className="min-h-screen bg-[#FBF7F0] text-[#2F3E2E] overflow-hidden relative">
      <PortalTransition isOpen={portalOpen} onComplete={() => {}} color="sage" size={200} />

      <nav className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#7BA68C] to-[#A8C4A0] flex items-center justify-center shadow-lg shadow-[#7BA68C]/30 text-white">
            <HeartPulse className="w-6 h-6" />
          </span>
          <span className="leading-tight">
            <span className="block font-semibold text-lg tracking-tight">Meridian Health</span>
            <span className="block text-xs text-[#7BA68C] font-medium">Hospital Management</span>
          </span>
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#5A6B57]">
          <a href="#services" className="hover:text-[#2F3E2E] transition-colors">Services</a>
          <a href="#departments" className="hover:text-[#2F3E2E] transition-colors">Departments</a>
          <a href="#about" className="hover:text-[#2F3E2E] transition-colors">Why Us</a>
        </div>
        <button
          type="button"
          onClick={handleEnterPortal}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#2F3E2E] text-white text-sm font-semibold hover:bg-[#3D523B] transition-colors shadow-md"
        >
          Enter Portal
          <ArrowRight className="w-4 h-4" />
        </button>
      </nav>

      <main>
        <section className="max-w-7xl mx-auto px-6 lg:px-10 pt-8 pb-6 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#EAF0E6] text-[#5A6B57] text-xs font-semibold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-[#7BA68C] animate-pulse" />
              Empathetic care, reimagined
            </span>
            <h1 className="mt-6 text-5xl md:text-6xl font-semibold tracking-tight leading-[1.05] text-balance">
              Your health, in <span className="text-[#7BA68C]">caring</span> hands.
            </h1>
            <p className="mt-5 text-lg text-[#5A6B57] max-w-md leading-relaxed">
              A calm, connected hospital experience for patients, clinicians, and administrators — all behind one gentle doorway.
            </p>
            <button
              type="button"
              onClick={handleEnterPortal}
              className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#7BA68C] text-white text-sm font-semibold hover:bg-[#5C8A70] transition-colors shadow-lg shadow-[#7BA68C]/30"
            >
              <ArrowRight className="w-4 h-4" />
              Enter the Portal
            </button>
            <div className="mt-6 flex items-center gap-5 text-sm text-[#5A6B57]">
              <span className="inline-flex items-center gap-1.5"><Lock className="w-4 h-4" /> HIPAA-secure</span>
              <span className="inline-flex items-center gap-1.5"><Clock className="w-4 h-4" /> 24/7 access</span>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="rounded-[2rem] bg-white p-3 shadow-[0_24px_60px_rgba(47,62,46,0.08)]">
              <div className="relative h-[340px] rounded-[1.5rem] overflow-hidden bg-gradient-to-br from-[#EAF0E6] via-[#F3EDE2] to-[#d7e4d4]">
                <div className="absolute inset-0 flex items-end p-8">
                  <div>
                    <p className="text-sm font-medium text-[#5A6B57]">Care team, on the ward</p>
                    <p className="text-2xl font-semibold tracking-tight mt-1">A quieter way to run a hospital.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -top-4 left-8 bg-white rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-[#EAF0E6] flex items-center justify-center">
                <HeartPulse className="w-4 h-4 text-[#5C8A70]" />
              </span>
              <span>
                <span className="block text-xs text-[#5A6B57]">Vitals stable</span>
                <span className="block text-sm font-semibold">98 bpm</span>
              </span>
            </div>
            <div className="absolute -bottom-4 right-6 bg-white rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-[#F3EDE2] flex items-center justify-center">
                <Calendar className="w-4 h-4 text-[#C99A6A]" />
              </span>
              <span>
                <span className="block text-xs text-[#5A6B57]">Next visit</span>
                <span className="block text-sm font-semibold">Sep 19, 10:30</span>
              </span>
            </div>
          </motion.div>
        </section>

        <section id="stats" className="max-w-7xl mx-auto px-6 lg:px-10 py-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-3xl p-6 shadow-sm border border-[#EAF0E6]/80">
              <span className="w-10 h-10 rounded-2xl bg-[#EAF0E6] flex items-center justify-center mb-4 text-[#5C8A70]">
                <stat.icon className="w-5 h-5" />
              </span>
              <p className="text-3xl font-semibold tracking-tight">{stat.value}</p>
              <p className="text-sm text-[#5A6B57] mt-1">{stat.label}</p>
            </div>
          ))}
        </section>

        <section id="services" className="max-w-7xl mx-auto px-6 lg:px-10 py-8">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Everything under one calm roof</h2>
            <p className="mt-3 text-[#5A6B57]">From booking to billing, every step is designed to feel human.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {services.map((service) => (
              <div key={service.title} className="bg-white rounded-3xl p-6 border border-[#EAF0E6]/80 shadow-sm">
                <span className="w-10 h-10 rounded-2xl bg-[#EAF0E6] flex items-center justify-center mb-4 text-[#5C8A70]">
                  <service.icon className="w-5 h-5" />
                </span>
                <h3 className="font-semibold">{service.title}</h3>
                <p className="mt-2 text-sm text-[#5A6B57] leading-relaxed">{service.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="departments" className="max-w-7xl mx-auto px-6 lg:px-10 py-16">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Our specialties</h2>
            <p className="mt-3 text-[#5A6B57]">Comprehensive care, one shared record.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {departments.map((dept) => (
              <Link
                key={dept.name}
                href={`/departments/${slugify(dept.name)}`}
                className="bg-white rounded-3xl p-5 border border-[#EAF0E6]/80 shadow-sm hover:shadow-md transition-shadow"
              >
                <h3 className="font-semibold">{dept.name}</h3>
                <p className="mt-1 text-sm text-[#5A6B57]">{dept.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        <section id="about" className="max-w-5xl mx-auto px-6 lg:px-10 pb-20">
          <div className="relative rounded-[2rem] bg-white p-10 md:p-14 text-center overflow-hidden shadow-sm border border-[#EAF0E6]/80">
            <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-[#7BA68C]/15 blur-3xl" />
            <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-[#C99A6A]/15 blur-3xl" />
            <div className="relative">
              <Shield className="w-8 h-8 mx-auto text-[#7BA68C]" />
              <h2 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight">Step through the doorway to better care</h2>
              <p className="mt-3 text-[#5A6B57] max-w-lg mx-auto">
                One portal for patients, clinicians, and administrators. Open the door and begin.
              </p>
              <button
                type="button"
                onClick={handleEnterPortal}
                className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#2F3E2E] text-white text-sm font-semibold hover:bg-[#3D523B] transition-colors"
              >
                Enter the Portal
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="max-w-7xl mx-auto px-6 lg:px-10 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-[#5A6B57]">
        <p>Meridian Health — Empathetic care, always.</p>
        <p>© {new Date().getFullYear()} Meridian Health. All rights reserved.</p>
      </footer>
    </div>
  )
}
