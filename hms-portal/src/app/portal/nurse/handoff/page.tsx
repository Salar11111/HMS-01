"use client"

import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { Card, CardContent } from "@/components/ui/Card"
import { PageHeader } from "@/components/portal/PageHeader"
import { PortalState } from "@/components/portal/PortalState"
import { useNursePortal } from "@/lib/use-portal-data"
import { formatDate, formatTime } from "@/lib/utils"

export default function NurseHandoffPage() {
  const { data, loading, error } = useNursePortal()

  if (loading) return <PortalLayout role="nurse"><PortalState loading /></PortalLayout>
  if (error || !data.profile) return <PortalLayout role="nurse"><PortalState error={error} /></PortalLayout>

  const nameById = new Map(data.patients.map(p => [p.id, p.name]))
  const handoff = data.notes.filter(note => note.noteType.toUpperCase() === "HANDOFF")

  return (
    <PortalLayout role="nurse">
      <div className="space-y-6">
        <PageHeader title="Shift Handoff" description="Handoff notes recorded for the current census" />
        {handoff.length === 0 ? (
          <p className="text-sm text-clay-500">No handoff notes recorded.</p>
        ) : (
          <div className="space-y-3">
            {handoff.map(note => (
              <Card key={note.id}>
                <CardContent className="p-4 space-y-1">
                  <div className="flex justify-between gap-3">
                    <p className="font-medium text-clay-900">{nameById.get(note.patientId) ?? "Patient"}</p>
                    <p className="text-xs text-clay-500">{formatDate(note.createdAt)} · {formatTime(note.createdAt)}</p>
                  </div>
                  <p className="text-sm text-clay-700">{note.content}</p>
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
