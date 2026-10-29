"use client"

import { FormEvent, useState } from "react"
import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { PageHeader } from "@/components/portal/PageHeader"
import { PortalState } from "@/components/portal/PortalState"
import { sendJson } from "@/lib/api-action"
import { useNursePortal } from "@/lib/use-portal-data"
import { formatDate, formatTime } from "@/lib/utils"

export default function NurseNotesPage() {
  const { data, loading, error, refresh } = useNursePortal()
  const [patientId, setPatientId] = useState("")
  const [content, setContent] = useState("")
  const [noteType, setNoteType] = useState<"PROGRESS" | "MEDICATION" | "HANDOFF">("PROGRESS")
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  if (loading) return <PortalLayout role="nurse"><PortalState loading /></PortalLayout>
  if (error || !data.profile) return <PortalLayout role="nurse"><PortalState error={error} /></PortalLayout>

  const nameById = new Map(data.patients.map(p => [p.id, p.name]))
  const selectedPatient = patientId || data.patients[0]?.id || ""

  async function save(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      await sendJson("/api/notes", "POST", { patientId: selectedPatient, content, noteType })
      setContent("")
      refresh()
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "Could not save the note")
    } finally {
      setSaving(false)
    }
  }

  return (
    <PortalLayout role="nurse">
      <div className="space-y-6">
        <PageHeader title="Nursing Notes" description="Progress, medication, and handoff notes" />
        <Card padding="md">
          <CardHeader><CardTitle>Add a note</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={event => void save(event)} className="grid gap-4">
              <label className="text-sm font-medium text-clay-700">
                Patient
                <select className="clay-input mt-1.5" value={selectedPatient} onChange={event => setPatientId(event.target.value)} required>
                  {data.patients.map(patient => (
                    <option key={patient.id} value={patient.id}>{patient.name}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-clay-700">
                Type
                <select className="clay-input mt-1.5" value={noteType} onChange={event => setNoteType(event.target.value as typeof noteType)}>
                  <option value="PROGRESS">Progress</option>
                  <option value="MEDICATION">Medication</option>
                  <option value="HANDOFF">Handoff</option>
                </select>
              </label>
              <label className="text-sm font-medium text-clay-700">
                Note
                <textarea className="clay-input mt-1.5 min-h-24" value={content} onChange={event => setContent(event.target.value)} required />
              </label>
              {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
              <div>
                <Button type="submit" disabled={saving || !selectedPatient || !content.trim()}>{saving ? "Saving…" : "Save note"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
        {data.notes.length === 0 ? (
          <p className="text-sm text-clay-500">No nursing notes yet.</p>
        ) : (
          <div className="space-y-3">
            {data.notes.map(note => (
              <Card key={note.id}>
                <CardContent className="p-4 space-y-1">
                  <div className="flex justify-between gap-3 text-xs text-clay-500">
                    <span>{nameById.get(note.patientId) ?? "Patient"} · {note.noteType}</span>
                    <span>{formatDate(note.createdAt)} · {formatTime(note.createdAt)}</span>
                  </div>
                  <p className="text-sm text-clay-800">{note.content}</p>
                  <p className="text-xs text-clay-500">{note.authorName}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  )
}
