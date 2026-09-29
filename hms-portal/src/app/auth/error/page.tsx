import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/Button"

export const metadata = {
  title: "Sign-in Error — Meridian Health",
}

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  const messages: Record<string, string> = {
    CredentialsSignin: "The email or password you entered is incorrect. Please try again.",
    AccessDenied: "Your account does not have permission to open that portal.",
    SessionRequired: "Please sign in to view that page.",
    Configuration: "The sign-in service is not configured correctly. Please contact support.",
    Default: "Something went wrong while signing you in. Please try again.",
  }

  const message = error ? messages[error] ?? messages.Default : messages.Default

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md text-center">
        <div className="clay-card p-8">
          <span className="w-14 h-14 mx-auto rounded-2xl bg-accent-coral/15 flex items-center justify-center mb-4">
            <AlertTriangle className="w-7 h-7 text-accent-coral" />
          </span>
          <h1 className="font-display text-2xl font-semibold text-clay-900">Sign-in problem</h1>
          <p className="text-clay-600 mt-3">{message}</p>
          {error && (
            <p className="mt-3 text-xs text-clay-500 font-mono">{error}</p>
          )}
          <div className="flex flex-col gap-2 mt-6">
            <Button href="/auth/signin">Try again</Button>
            <Button variant="ghost" href="/">
              Back to home
            </Button>
          </div>
        </div>
        <p className="mt-6 text-xs text-clay-500">
          Need help? Contact{" "}
          <Link href="mailto:security@meridianhealth.org" className="text-sage-600 hover:text-sage-700">
            security@meridianhealth.org
          </Link>
        </p>
      </div>
    </div>
  )
}
