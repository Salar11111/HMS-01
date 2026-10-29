"use client"

import { FormEvent, useState } from "react"
import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { PageHeader } from "@/components/portal/PageHeader"
import { PortalState } from "@/components/portal/PortalState"
import { sendJson } from "@/lib/api-action"
import { usePatientPortal } from "@/lib/use-portal-data"
import { formatDate, formatTime } from "@/lib/utils"

export default function PatientMessagesPage() {
  const { data, loading, error, refresh } = usePatientPortal()
  const [recipientId, setRecipientId] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (loading) return <PortalLayout role="patient"><PortalState loading /></PortalLayout>
  if (error || !data.profile) return <PortalLayout role="patient"><PortalState error={error} /></PortalLayout>

  const careTeam = data.physicians.filter(doctor =>
    data.appointments.some(appointment => appointment.doctorId === doctor.id)
  )
  const selectedRecipient = recipientId || careTeam[0]?.userId || ""

  async function send(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      await sendJson("/api/messages", "POST", {
        recipientId: selectedRecipient,
        subject,
        body,
      })
      setSubject("")
      setBody("")
      refresh()
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Could not send the message")
    } finally {
      setSaving(false)
    }
  }

  async function markRead(id: string) {
    try {
      await sendJson("/api/messages", "PATCH", { id })
      refresh()
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Could not update the message")
    }
  }

  return (
    <PortalLayout role="patient">
      <div className="space-y-6">
        <PageHeader title="Messages" description={`${data.unreadMessages} unread`} />
        <Card>
          <CardContent className="p-4">
            {careTeam.length === 0 ? (
              <p className="text-sm text-clay-500">A physician appears here after you have a visit with them.</p>
            ) : (
              <form onSubmit={event => void send(event)} className="space-y-4">
                <label className="block text-sm font-medium text-clay-700">
                  To
                  <select className="clay-input mt-1.5" value={selectedRecipient} onChange={event => setRecipientId(event.target.value)}>
                    {careTeam.map(doctor => (
                      <option key={doctor.userId} value={doctor.userId}>{doctor.name}</option>
                    ))}
                  </select>
                </label>
                <Input label="Subject" value={subject} onChange={event => setSubject(event.target.value)} required />
                <label className="block text-sm font-medium text-clay-700">
                  Message
                  <textarea className="clay-input mt-1.5 min-h-28" value={body} onChange={event => setBody(event.target.value)} required />
                </label>
                {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
                <Button type="submit" disabled={saving}>{saving ? "Sending…" : "Send message"}</Button>
              </form>
            )}
          </CardContent>
        </Card>
        {data.messages.length === 0 ? (
          <p className="text-sm text-clay-500">No messages.</p>
        ) : (
          <div className="space-y-3">
            {data.messages.map(message => (
              <Card key={message.id}>
                <CardContent className="p-4 space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-clay-900">{message.subject}</p>
                    <p className="text-xs text-clay-500">{formatDate(message.createdAt)} · {formatTime(message.createdAt)}</p>
                  </div>
                  <p className="text-xs text-clay-500">
                    {message.direction === "incoming" ? message.senderName : "You"} → {message.direction === "incoming" ? "You" : message.recipientName}
                    {message.read ? "" : " · Unread"}
                  </p>
                  <p className="text-sm text-clay-700">{message.body}</p>
                  {message.direction === "incoming" && !message.read && (
                    <Button variant="ghost" size="sm" onClick={() => void markRead(message.id)}>Mark read</Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  )
}
