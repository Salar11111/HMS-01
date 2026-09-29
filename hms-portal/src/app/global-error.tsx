"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/Button"
import { RefreshCw, Home, AlertTriangle } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Global error:", error)
  }, [error])

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-[color-mix(in_srgb,_var(--accent-coral)_15%,_transparent)] flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-[var(--accent-coral)]" />
        </div>
        <h1 className="font-display text-4xl font-semibold text-clay-900 mb-2">Something Went Wrong</h1>
        <p className="text-clay-600 mb-6">
          We encountered an unexpected error. Our team has been notified.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={reset} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
          {/* A full reload is intentional here: the router can be in a broken state after a crash. */}
          {/* eslint-disable-next-line @next/next/no-location-assign-relative-destination */}
          <Button variant="secondary" onClick={() => window.location.href = "/"}>
            <Home className="w-4 h-4" />
            Go Home
          </Button>
        </div>
        {process.env.NODE_ENV === "development" && (
          <details className="mt-8 text-left p-4 bg-cream-100 rounded-xl text-sm text-clay-600">
            <summary className="font-medium text-clay-900 mb-2 cursor-pointer">Error Details</summary>
            <pre className="overflow-auto max-h-64">{error.message}</pre>
            {error.digest && <p className="mt-2">Digest: {error.digest}</p>}
          </details>
        )}
      </div>
    </div>
  )
}