"use client"

import { FormEvent, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Bell, CalendarDays, Lock, Save, Shield, User } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { PageHeader } from "@/components/portal/PageHeader"
import { Input } from "@/components/ui/Input"
import { sendJson } from "@/lib/api-action"
import { notificationDefaults, type NotificationPrefs } from "@/server/preferences"
import { formatDate } from "@/lib/utils"

interface SettingsPanelProps {
  role: "patient" | "doctor" | "nurse" | "admin"
}

type LeaveRow = {
  id: string
  type: string
  startDate: string
  endDate: string
  reason: string | null
  status: string
}

const roleCopy = {
  patient: { title: "Settings", description: "Display name, notification preferences, and password" },
  doctor: { title: "Settings", description: "Display name, leave requests, notification preferences, and password" },
  nurse: { title: "Settings", description: "Display name, leave requests, notification preferences, and password" },
  admin: { title: "Settings", description: "Display name, leave requests, notification preferences, and password" },
} as const

function isoDate(offsetDays = 0) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + offsetDays)
  return date.toISOString().slice(0, 10)
}

const notificationFields: { id: keyof NotificationPrefs; label: string; detail: string }[] = [
  { id: "appointments", label: "Appointment reminders", detail: "Saved on your account. This demo does not send email or SMS." },
  { id: "results", label: "New results available", detail: "Saved on your account. This demo does not send a message." },
  { id: "messages", label: "Care team messages", detail: "Saved on your account. This demo does not send a push or email." },
  { id: "billing", label: "Billing statements", detail: "Saved on your account. This demo does not send a statement." },
  { id: "marketing", label: "Wellness programmes", detail: "Saved on your account. This demo does not send marketing." },
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
  const [detail, setDetail] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)
  const [leaveType, setLeaveType] = useState("ANNUAL")
  const [leaveStart, setLeaveStart] = useState(isoDate(14))
  const [leaveEnd, setLeaveEnd] = useState(isoDate(18))
  const [leaveReason, setLeaveReason] = useState("")
  const [leaveRows, setLeaveRows] = useState<LeaveRow[]>([])
  const [leaveMessage, setLeaveMessage] = useState<string | null>(null)
  const [leaveRevision, setLeaveRevision] = useState(0)
  const canRequestLeave = role !== "patient"

  useEffect(() => {
    let cancelled = false
    fetch("/api/account")
      .then(response => (response.ok ? response.json() : null))
      .then(body => {
        if (cancelled || !body) return
        setName(body.name ?? "")
        setEmail(body.email ?? "")
        setDetail(body.detail ?? "")
        setNotifications(body.notifications)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!canRequestLeave) return
    let cancelled = false
    fetch("/api/leave")
      .then(async response => {
        const body = (await response.json().catch(() => null)) as { leaveRequests?: LeaveRow[] } | null
        if (!cancelled && response.ok) setLeaveRows(body?.leaveRequests ?? [])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [canRequestLeave, leaveRevision])

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

  async function changePassword() {
    setSaving(true)
    setError(null)
    setPasswordMessage(null)
    try {
      await sendJson("/api/account", "PATCH", {
        name,
        notifications,
        currentPassword,
        newPassword,
      })
      setCurrentPassword("")
      setNewPassword("")
      setPasswordMessage("Password updated")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not change password")
    } finally {
      setSaving(false)
    }
  }

  async function submitLeave(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setLeaveMessage(null)
    try {
      await sendJson("/api/leave", "POST", {
        type: leaveType,
        startDate: leaveStart,
        endDate: leaveEnd,
        reason: leaveReason || undefined,
      })
      setLeaveReason("")
      setLeaveMessage("Leave request submitted for review")
      setLeaveRevision(value => value + 1)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not submit leave")
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
          <Input label="Role" value={detail} disabled />
        </CardContent>
      </Card>

      {canRequestLeave && (
        <Card padding="md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-sage-600" />
              Leave requests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={event => void submitLeave(event)} className="grid sm:grid-cols-2 gap-4">
              <label className="text-sm font-medium text-clay-700">
                Type
                <select className="clay-input mt-1.5" value={leaveType} onChange={event => setLeaveType(event.target.value)}>
                  <option value="ANNUAL">Annual</option>
                  <option value="SICK">Sick</option>
                  <option value="CME">CME</option>
                  <option value="UNPAID">Unpaid</option>
                </select>
              </label>
              <Input label="Reason" value={leaveReason} onChange={event => setLeaveReason(event.target.value)} />
              <Input label="Start" type="date" value={leaveStart} onChange={event => setLeaveStart(event.target.value)} required />
              <Input label="End" type="date" value={leaveEnd} onChange={event => setLeaveEnd(event.target.value)} required />
              <div className="sm:col-span-2">
                <Button type="submit" disabled={saving}>{saving ? "Submitting…" : "Submit leave"}</Button>
              </div>
            </form>
            {leaveMessage && <p className="text-sm text-sage-700">{leaveMessage}</p>}
            {leaveRows.length === 0 ? (
              <p className="text-sm text-clay-500">No leave requests yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {leaveRows.map(row => (
                  <li key={row.id} className="flex justify-between gap-3">
                    <span>
                      <span className="font-medium text-clay-900">{row.type}</span>
                      <span className="text-clay-600"> · {formatDate(row.startDate)} – {formatDate(row.endDate)}</span>
                    </span>
                    <span className="text-clay-500">{row.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

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
            <Input label="Current password" type="password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} autoComplete="current-password" />
            <Input label="New password" type="password" value={newPassword} onChange={event => setNewPassword(event.target.value)} autoComplete="new-password" hint="At least 8 characters" />
          </div>
          {passwordMessage && <p className="text-sm text-sage-700">{passwordMessage}</p>}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="secondary" size="sm" onClick={() => void changePassword()} disabled={saving || !currentPassword || !newPassword}>
              Change password
            </Button>
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
        <CardContent>
          <p className="text-sm text-clay-600">
            Record sharing and data export are not available in this demonstration.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
