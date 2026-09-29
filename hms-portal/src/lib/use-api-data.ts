"use client"

import { useEffect, useState } from "react"

type Result<T> = {
  data: T
  loading: boolean
  error: string | null
  refresh: () => void
}

/**
 * Fetches JSON from an internal API route.
 *
 * `loading` is derived from whether the settled state matches the current
 * request key rather than being set inside the effect, which avoids the
 * cascading render that a synchronous setState in an effect would cause.
 *
 * `fallback` is only the placeholder while the request is in flight. Callers
 * must render `error` instead of `data` when the request fails.
 */
export function useApiData<T>(path: string, fallback: T): Result<T> {
  const [nonce, setNonce] = useState(0)
  const [settled, setSettled] = useState<{
    key: string
    data: T
    error: string | null
  }>({ key: "", data: fallback, error: null })

  const key = `${path}#${nonce}`

  useEffect(() => {
    let cancelled = false

    fetch(path, { cache: "no-store" })
      .then(async response => {
        if (!response.ok) {
          throw new Error(`status ${response.status}`)
        }
        return (await response.json()) as T
      })
      .then(data => {
        if (cancelled) return
        setSettled({ key, data, error: null })
      })
      .catch((cause: unknown) => {
        if (cancelled) return
        setSettled({
          key,
          data: fallback,
          error: cause instanceof Error ? cause.message : "Unable to load data",
        })
      })

    return () => {
      cancelled = true
    }
    // `fallback` is a module-level constant at every call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const isCurrent = settled.key === key

  return {
    data: isCurrent ? settled.data : fallback,
    loading: !isCurrent,
    error: isCurrent ? settled.error : null,
    refresh: () => setNonce(n => n + 1),
  }
}
