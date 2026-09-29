"use client"

import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { Card, CardContent } from "@/components/ui/Card"
import { PageHeader } from "@/components/portal/PageHeader"
import { PortalState } from "@/components/portal/PortalState"
import { useNursePortal } from "@/lib/use-portal-data"
import { formatDate, formatTime } from "@/lib/utils"

export default function NurseNotesPage() {
  const { data, loading, error } = useNursePortal()

  if (loading) return <PortalLayout role="nurse"><PortalState loading /></PortalLayout>
  if (error || !data.profile) return <PortalLayout role="nurse"><PortalState error={error} /></PortalLayout>

  const nameById = new Map(data.patients.map(p => [p.id, p.name]))

  return (
    <PortalLayout role="nurse">
      <div className="space-y-6">
        <PageHeader title="Nursing Notes" description="Progress, medication, and handoff notes" />
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
