"use client"

import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { DataTable, type Column } from "@/components/portal/DataTable"
import { PageHeader } from "@/components/portal/PageHeader"
import { PortalState } from "@/components/portal/PortalState"
import { useNursePortal } from "@/lib/use-portal-data"
import type { NursePortalData } from "@/server/queries/portal"
import { formatTime } from "@/lib/utils"

type Vital = NursePortalData["latestVitals"][number]

export default function NurseVitalsPage() {
  const { data, loading, error } = useNursePortal()

  if (loading) return <PortalLayout role="nurse"><PortalState loading /></PortalLayout>
  if (error || !data.profile) return <PortalLayout role="nurse"><PortalState error={error} /></PortalLayout>

  const nameById = new Map(data.patients.map(p => [p.id, p.name]))
  const columns: Column<Vital>[] = [
    { key: "patient", header: "Patient", render: v => <span className="font-medium">{nameById.get(v.patientId) ?? "Patient"}</span> },
    { key: "time", header: "Time", render: v => <span>{formatTime(v.recordedAt)}</span> },
    { key: "bp", header: "BP", render: v => <span>{v.systolic ?? "—"}/{v.diastolic ?? "—"}</span> },
    { key: "hr", header: "HR", render: v => <span>{v.heartRate ?? "—"}</span> },
    { key: "spo2", header: "SpO2", render: v => <span>{v.oxygenSaturation ?? "—"}</span> },
    { key: "temp", header: "Temp", render: v => <span>{v.temperature ?? "—"}</span> },
    { key: "flag", header: "Flag", render: v => <span className={v.abnormal ? "text-accent-coral font-medium" : "text-clay-500"}>{v.abnormal ? "Out of range" : "In range"}</span> },
  ]

  return (
    <PortalLayout role="nurse">
      <div className="space-y-6">
        <PageHeader title="Vitals & Observations" description="Latest reading for each admitted patient" />
        <Card>
          <CardHeader><CardTitle>Latest vitals</CardTitle></CardHeader>
          <CardContent>
            <DataTable columns={columns} rows={data.latestVitals} rowKey={v => v.id} empty="No vitals recorded for admitted patients." />
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  )
}
