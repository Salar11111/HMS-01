"use client"

import { FormEvent, useEffect, useState } from "react"
import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { Button } from "@/components/ui/Button"
import { Card, CardContent } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { PageHeader } from "@/components/portal/PageHeader"
import { PortalState } from "@/components/portal/PortalState"
import { sendJson } from "@/lib/api-action"
import { useDoctorPortal } from "@/lib/use-portal-data"
import { formatDate, formatTime } from "@/lib/utils"

type Message = {
  id: string
  subject: string
  body: string
  createdAt: string
  read: boolean
  direction: "incoming" | "outgoing"
  senderName: string | null
  recipientName: string | null
  patientId: string | null
  patientName: string | null
  patientUserId: string | null
}

export default function DoctorMessagesPage() {
  const { data, loading, error, refresh } = useDoctorPortal()
  const [messages, setMessages] = useState<Message[]>([])
  const [listError, setListError] = useState<string | null>(null)
  const [patientId, setPatientId] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    let live = true
    fetch("/api/messages")
      .then(async response => {
        const payload = (await response.json().catch(() => null)) as { messages?: Message[]; error?: string } | null
        if (!live) return
        if (!response.ok) {
          setListError(payload?.error ?? "Could not load messages")
          return
        }
        setMessages(payload?.messages ?? [])
        setListError(null)
      })
      .catch(() => {
        if (live) setListError("Could not load messages")
      })
    return () => {
      live = false
    }
  }, [revision])

  if (loading) return <PortalLayout role="doctor"><PortalState loading /></PortalLayout>
  if (error || !data.profile) return <PortalLayout role="doctor"><PortalState error={error} /></PortalLayout>

  const selectedPatient = patientId || data.patients[0]?.id || ""
  const selected = data.patients.find(patient => patient.id === selectedPatient)
  const unread = messages.filter(row => row.direction === "incoming" && !row.read).length

  async function send(event: FormEvent) {
    event.preventDefault()
    if (!selected?.userId) {
      setFormError("Choose a patient on your panel")
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      await sendJson("/api/messages", "POST", {
        recipientId: selected.userId,
        patientId: selected.id,
        subject,
        body,
      })
      setSubject("")
      setBody("")
      setRevision(value => value + 1)
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
      setRevision(value => value + 1)
      refresh()
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Could not update the message")
    }
  }

  return (
    <PortalLayout role="doctor">
      <div className="space-y-6">
        <PageHeader title="Messages" description={`${unread} unread from your panel`} />
        <Card>
          <CardContent className="p-4">
            {data.patients.length === 0 ? (
              <p className="text-sm text-clay-500">Patients appear here after a visit or admission on your panel.</p>
            ) : (
              <form onSubmit={event => void send(event)} className="space-y-4">
                <label className="block text-sm font-medium text-clay-700">
                  Patient
                  <select className="clay-input mt-1.5" value={selectedPatient} onChange={event => setPatientId(event.target.value)}>
                    {data.patients.map(patient => (
                      <option key={patient.id} value={patient.id}>{patient.name}</option>
                    ))}
                  </select>
                </label>
                <Input label="Subject" value={subject} onChange={event => setSubject(event.target.value)} required />
                <label className="block text-sm font-medium text-clay-700">
                  Message
                  <textarea className="clay-input mt-1.5 min-h-28" value={body} onChange={event => setBody(event.target.value)} required />
                </label>
                {(formError || listError) && <p role="alert" className="text-sm text-red-700">{formError ?? listError}</p>}
                <Button type="submit" disabled={saving || !selectedPatient}>{saving ? "Sending…" : "Send reply"}</Button>
              </form>
            )}
          </CardContent>
        </Card>
        {messages.length === 0 ? (
          <p className="text-sm text-clay-500">No messages.</p>
        ) : (
          <div className="space-y-3">
            {messages.map(message => (
              <Card key={message.id}>
                <CardContent className="p-4 space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-clay-900">{message.subject}</p>
                    <p className="text-xs text-clay-500">{formatDate(message.createdAt)} · {formatTime(message.createdAt)}</p>
                  </div>
                  <p className="text-xs text-clay-500">
                    {message.direction === "incoming" ? message.senderName : "You"}
                    {" → "}
                    {message.direction === "incoming" ? "You" : message.recipientName}
                    {message.patientName ? ` · ${message.patientName}` : ""}
                  </p>
                  <p className="text-sm text-clay-700 whitespace-pre-wrap">{message.body}</p>
                  {message.direction === "incoming" && !message.read && (
                    <Button type="button" size="sm" variant="outline" onClick={() => void markRead(message.id)}>
                      Mark read
                    </Button>
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
