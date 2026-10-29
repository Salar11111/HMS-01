"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { sendJson } from "@/lib/api-action"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"

export function RegisterForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await sendJson("/api/auth/register", "POST", { name, email, password })
      setDone(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create the account")
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <div className="clay-card p-6 space-y-4">
        <p className="text-sm text-clay-700">Your patient account is ready. Sign in with the email and password you just chose.</p>
        <Button href="/auth/signin" className="w-full">Go to sign in</Button>
      </div>
    )
  }

  return (
    <form onSubmit={event => void submit(event)} className="clay-card p-6 space-y-4">
      <Input label="Full name" value={name} onChange={event => setName(event.target.value)} required />
      <Input label="Email" type="email" value={email} onChange={event => setEmail(event.target.value)} required />
      <Input label="Password" type="password" value={password} onChange={event => setPassword(event.target.value)} hint="At least 8 characters" required />
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <Button type="submit" className="w-full" disabled={saving}>{saving ? "Creating…" : "Create patient account"}</Button>
      <p className="text-sm text-clay-600">
        Already have an account? <Link href="/auth/signin" className="text-sage-700 underline">Sign in</Link>
      </p>
    </form>
  )
}
