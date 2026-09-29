"use client"

/**
 * Loading and failure states for portal pages.
 * A failed request stays on this message so fixture charts are never shown
 * in place of a 403 or a database error.
 */
export function PortalState({
  loading = false,
  error = null,
}: {
  loading?: boolean
  error?: string | null
}) {
  if (loading) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 text-clay-600">
        <div className="w-8 h-8 border-2 border-sage-500 border-t-transparent rounded-full animate-spin" />
        <p>Loading records…</p>
      </div>
    )
  }

  return (
    <p role="alert" className="text-sm text-[var(--accent-coral)]">
      Could not load this page{error ? ` (${error})` : ""}. Refresh to try again.
    </p>
  )
}
