import Link from "next/link"
import { Stethoscope } from "lucide-react"
import { RegisterForm } from "./RegisterForm"

export const metadata = {
  title: "Patient Registration — Meridian Health",
  description: "Create a Meridian Health patient account.",
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-6">
            <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sage-500 to-sage-400 flex items-center justify-center text-white shadow-lg shadow-sage-500/30">
              <Stethoscope className="w-5 h-5" />
            </span>
            <span className="font-semibold text-clay-900">Meridian Health</span>
          </Link>
          <h1 className="font-display text-3xl font-semibold text-clay-900">Patient registration</h1>
          <p className="text-clay-600 mt-2">Create your Meridian Health patient account</p>
        </div>

        <div className="mb-4 p-4 rounded-xl bg-sage-50 border border-sage-200">
          <p className="text-sm text-clay-700">
            Self-registration creates a <strong>patient</strong> account. Doctor, nurse, and administrator
            accounts are provisioned by the hospital.
          </p>
        </div>
        <RegisterForm />

        <p className="mt-6 text-center text-xs text-clay-500">
          This is a portfolio demonstration. Do not enter real patient information.
        </p>
      </div>
    </div>
  )
}
