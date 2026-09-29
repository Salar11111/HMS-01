import Link from "next/link"
import { Stethoscope } from "lucide-react"
import { Button } from "@/components/ui/Button"

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

        <div className="clay-card p-6 space-y-4">
          <div className="p-4 rounded-xl bg-sage-50 border border-sage-200">
            <p className="text-sm text-clay-700">
              Self-registration is limited to <strong>patient</strong> accounts in this portfolio build.
              Clinical staff accounts — doctor, nurse and administrator — are provisioned by the
              hospital administration team.
            </p>
          </div>

          <div>
            <h2 className="font-medium text-clay-900">In a production release</h2>
            <ul className="mt-2 space-y-1.5 text-sm text-clay-600">
              <li>• Patient intake questionnaire with insurance details</li>
              <li>• Identity verification before the first appointment</li>
              <li>• Consent capture for record sharing and communications</li>
              <li>• Email confirmation with a one-time activation link</li>
            </ul>
          </div>

          <p className="text-sm text-clay-600">
            To explore the system now, sign in with one of the demo accounts.
          </p>

          <Button href="/auth/signin" className="w-full">
            Go to sign in
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-clay-500">
          This is a portfolio demonstration. Do not enter real patient information.
        </p>
      </div>
    </div>
  )
}
