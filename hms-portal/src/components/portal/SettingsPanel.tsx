"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Bell, Lock, Save, Shield, User } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { PageHeader } from "@/components/portal/PageHeader"
import { Input } from "@/components/ui/Input"
import { notificationDefaults, type NotificationPrefs } from "@/server/preferences"

interface SettingsPanelProps {
  role: "patient" | "doctor" | "nurse" | "admin"
}

const roleCopy = {
  patient: {
    title: "Settings",
    description: "Profile, notifications, privacy and access",
    name: "Sarah Johnson",
    email: "patient@demo.com",
    detail: "MRN-100234 · Blue Cross Blue Shield",
  },
  doctor: {
    title: "Settings",
    description: "Clinical preferences, availability and notifications",
    name: "Dr. Michael Chen",
    email: "doctor@demo.com",
    detail: "Cardiology · Licence MD-12345-CA",
  },
  nurse: {
    title: "Settings",
    description: "Shift preferences, MAR defaults and notifications",
    name: "Emily Rodriguez, RN",
    email: "nurse@demo.com",
    detail: "Nursing · Licence RN-88231-CA",
  },
  admin: {
    title: "Settings",
    description: "Organisation profile, permissions and security",
    name: "James Wilson",
    email: "admin@demo.com",
    detail: "Administrator · Billing, inventory, HR, compliance",
  },
} as const

const notificationFields: { id: keyof NotificationPrefs; label: string; detail: string }[] = [
  { id: "appointments", label: "Appointment reminders", detail: "Email and SMS, 24h before" },
  { id: "results", label: "New results available", detail: "Notify when a clinician releases results" },
  { id: "messages", label: "Care team messages", detail: "Push and email" },
  { id: "billing", label: "Billing statements", detail: "Invoice issued and payment due" },
  { id: "marketing", label: "Wellness programmes", detail: "Optional health programmes and events" },
]

export function SettingsPanel({ role }: SettingsPanelProps) {
  const copy = roleCopy[role]
  const { data: session, update } = useSession()
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState(session?.user?.name ?? "")
  const [email, setEmail] = useState(session?.user?.email ?? "")
  const [notifications, setNotifications] = useState<NotificationPrefs>(notificationDefaults)

  useEffect(() => {
    let cancelled = false
    fetch("/api/account")
      .then(response => (response.ok ? response.json() : null))
      .then(body => {
        if (cancelled || !body) return
        setName(body.name ?? "")
        setEmail(body.email ?? "")
        setNotifications(body.notifications)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  async function save() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const response = await fetch("/api/account", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, notifications }),
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) {
        setError(body?.error ?? "Could not save settings")
        return
      }
      setName(body.name)
      setNotifications(body.notifications)
      setSaved(true)
      void update({ name: body.name })
    } catch {
      setError("Could not save settings")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title={copy.title}
        description={copy.description}
        actions={
          <Button onClick={() => void save()} disabled={saving}>
            <Save className="w-4 h-4" />
            {saving ? "Saving…" : saved ? "Saved" : "Save changes"}
          </Button>
        }
      />

      <Card padding="md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-sage-600" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <Input label="Full name" value={name} onChange={event => setName(event.target.value)} />
          <Input label="Email" value={email} type="email" disabled />
          {error && <p className="sm:col-span-2 text-sm text-red-700">{error}</p>}
          <Input label="Role" defaultValue={copy.detail} disabled />
        </CardContent>
      </Card>

      <Card padding="md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-sage-600" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {notificationFields.map(item => (
            <label
              key={item.id}
              className="flex items-center justify-between gap-4 p-3 rounded-xl bg-cream-100 clay-card-inset cursor-pointer"
            >
              <span>
                <span className="block text-sm font-medium text-clay-900">{item.label}</span>
                <span className="block text-xs text-clay-500">{item.detail}</span>
              </span>
              <input
                type="checkbox"
                checked={notifications[item.id]}
                onChange={event =>
                  setNotifications(current => ({ ...current, [item.id]: event.target.checked }))
                }
                className="w-5 h-5 rounded accent-sage-500 flex-shrink-0"
              />
            </label>
          ))}
        </CardContent>
      </Card>

      <Card padding="md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-sage-600" />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Current password" type="password" placeholder="••••••••" />
            <Input label="New password" type="password" placeholder="At least 8 characters" />
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="secondary" size="sm">Change password</Button>
            <Button variant="ghost" size="sm">Enable two-factor authentication</Button>
          </div>
        </CardContent>
      </Card>

      <Card padding="md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-sage-600" />
            Privacy &amp; data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="p-3 rounded-xl bg-cream-100 clay-card-inset">
            <p className="text-sm text-clay-700">Record sharing consent</p>
            <p className="text-xs text-clay-500 mt-1">
              You control which specialists can access your record. Sharing can be time-limited and is revoked instantly.
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="sage" size="sm">Cardiology — active</Badge>
              <Badge variant="clay" size="sm">Primary Care — active</Badge>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-cream-100 clay-card-inset">
            <p className="text-sm text-clay-700">Download my data</p>
            <p className="text-xs text-clay-500 mt-1">Export a machine-readable copy of your records and access history.</p>
            <Button variant="ghost" size="sm" className="mt-2">Request export</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
