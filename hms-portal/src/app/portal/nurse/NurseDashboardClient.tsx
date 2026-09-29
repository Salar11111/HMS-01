"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  Activity, AlertTriangle, Bed, CheckSquare, ClipboardList, Clock, HeartPulse,
  MessageSquare, Pill, Stethoscope, Thermometer, Users, Wind,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { DataTable, StatusBadge, type Column } from "@/components/portal/DataTable"
import { PageHeader, StatCard } from "@/components/portal/PageHeader"
import { PortalState } from "@/components/portal/PortalState"
import { useNursePortal } from "@/lib/use-portal-data"
import type { NursePortalData } from "@/server/queries/portal"
import { cn, formatDate, formatTime } from "@/lib/utils"

type Medication = NonNullable<NursePortalData["medications"]>[number]
type Vital = NonNullable<NursePortalData["latestVitals"]>[number]
type Note = NonNullable<NursePortalData["notes"]>[number]

export function NurseDashboardClient() {
  const [roundStarted, setRoundStarted] = useState(false)
  const { data, loading, error } = useNursePortal()

  const medications = useMemo(() => data.medications ?? [], [data.medications])
  const patients = useMemo(() => data.patients ?? [], [data.patients])
  const notes = useMemo(() => data.notes ?? [], [data.notes])
  const vitals = useMemo(() => data.latestVitals ?? [], [data.latestVitals])

  const medStats = useMemo(() => {
    const given = medications.filter(m => m.status === "GIVEN").length
    const held = medications.filter(m => m.status === "HELD").length
    const pending = medications.filter(m => m.status === "PENDING").length
    return { given, held, pending, total: medications.length }
  }, [medications])

  const escalated = vitals.filter(v => v.abnormal).length
  const pendingLabs = data.stats?.pendingLabCount ?? 0

  const nameByPatientId = useMemo(
    () => new Map(patients.map(p => [p.id, p.name])),
    [patients]
  )

  const medColumns: Column<Medication>[] = [
    {
      key: "time",
      header: "Time",
      render: m => <span className="font-medium text-clay-900">{formatTime(m.administeredAt)}</span>,
    },
    {
      key: "patient",
      header: "Patient",
      render: m => <span>{nameByPatientId.get(m.patientId) ?? "—"}</span>,
    },
    {
      key: "drug",
      header: "Medication",
      render: m => <span className="font-medium text-clay-900">{m.drugName}</span>,
    },
    { key: "dosage", header: "Dose", render: m => <Badge variant="clay" size="sm">{m.dosage}</Badge> },
    { key: "status", header: "Status", render: m => <StatusBadge status={m.status} /> },
    {
      key: "note",
      header: "Note",
      render: m => <span className="text-clay-500 text-xs">{m.notes || "—"}</span>,
    },
  ]

  const vitalColumns: Column<Vital & { patientName: string }>[] = [
    {
      key: "patient",
      header: "Patient",
      render: v => (
        <div>
          <p className="font-medium text-clay-900">{v.patientName}</p>
          <p className="text-xs text-clay-500">{formatTime(v.recordedAt)}</p>
        </div>
      ),
    },
    {
      key: "temp",
      header: "Temp",
      render: v => (
        <span className={cn(v.temperature != null && v.temperature > 38 && "text-accent-coral font-medium")}>
          {v.temperature != null ? `${v.temperature}°C` : "—"}
        </span>
      ),
    },
    {
      key: "hr",
      header: "HR",
      render: v => (
        <span className={cn(v.heartRate != null && v.heartRate > 100 && "text-accent-coral font-medium")}>
          {v.heartRate != null ? `${v.heartRate} bpm` : "—"}
        </span>
      ),
    },
    {
      key: "bp",
      header: "BP",
      render: v => (
        <span className={cn(
          (v.systolic != null && (v.systolic > 140 || v.systolic < 90)) && "text-accent-coral font-medium"
        )}>
          {v.systolic != null && v.diastolic != null ? `${v.systolic}/${v.diastolic}` : "—"}
        </span>
      ),
    },
    {
      key: "spo2",
      header: "SpO₂",
      render: v => (
        <span className={cn(v.oxygenSaturation != null && v.oxygenSaturation < 95 && "text-accent-coral font-medium")}>
          {v.oxygenSaturation != null ? `${v.oxygenSaturation}%` : "—"}
        </span>
      ),
    },
    { key: "pain", header: "Pain", render: v => <span>{v.painScore != null ? `${v.painScore}/10` : "—"}</span> },
    {
      key: "flag",
      header: "",
      render: v =>
        v.abnormal ? (
          <span className="inline-flex items-center gap-1 text-accent-coral text-xs font-medium">
            <AlertTriangle className="w-3 h-3" /> Outside range
          </span>
        ) : (
          <span className="text-xs text-clay-500">Within range</span>
        ),
    },
  ]

  const vitalRows: (Vital & { patientName: string })[] = vitals.map(v => ({
    ...v,
    patientName: nameByPatientId.get(v.patientId) ?? "—",
  }))

  if (loading) return <PortalState loading />
  if (error || !data.profile) return <PortalState error={error} />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nursing Dashboard"
        description={`${data.profile.name} · ${data.profile.shift ?? "Day"} shift${data.profile.departmentName ? ` · ${data.profile.departmentName}` : ""}`}
        actions={
          <>
            <Button variant="secondary" href="/portal/nurse/handoff">
              <ClipboardList className="w-4 h-4" />
              Shift Handoff
            </Button>
            <Button onClick={() => setRoundStarted(true)} disabled={roundStarted}>
              <Stethoscope className="w-4 h-4" />
              {roundStarted ? "Round started" : "Start Med Round"}
            </Button>
          </>
        }
      />

      {error && (
        <p role="alert" className="text-sm text-accent-coral">
          Could not load your dashboard (request {error}). Please refresh to try again.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Patients Assigned"
          value={loading ? "—" : String(data.stats?.admittedCount ?? 0)}
          hint={`${data.stats?.wardsOccupied ?? 0} ward${data.stats?.wardsOccupied === 1 ? "" : "s"}`}
          icon={Users}
          accent="sage"
        />
        <StatCard
          label="Meds Due This Round"
          value={loading ? "—" : String(medStats.pending)}
          hint={`${medStats.given} given · ${medStats.held} held`}
          icon={Pill}
          accent="gold"
          progress={medStats.total ? (medStats.given / medStats.total) * 100 : 0}
        />
        <StatCard
          label="Out-of-Range Vitals"
          value={loading ? "—" : String(escalated)}
          hint="Escalated to on-call"
          icon={HeartPulse}
          accent="coral"
        />
        <StatCard
          label="Pending Lab Orders"
          value={loading ? "—" : String(pendingLabs)}
          hint={`${notes.length} nursing notes logged`}
          icon={CheckSquare}
          accent="clay"
        />
      </div>

      <div className="grid xl:grid-cols-3 gap-6">
        <Card padding="none" className="xl:col-span-2">
          <CardHeader className="p-6 border-b border-cream-200 mb-0">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>My Patients</CardTitle>
                <p className="text-sm text-clay-600">Ward census, bed and diagnosis overview</p>
              </div>
              <Button variant="ghost" size="sm" href="/portal/nurse/patients">
                View all
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-cream-200">
              {patients.length === 0 && !loading && (
                <p className="p-6 text-sm text-clay-500">No patients are currently admitted.</p>
              )}
              {patients.map((patient, index) => (
                <motion.div
                  key={patient.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-cream-50 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span
                      className={cn(
                        "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0",
                        patient.lastVitals?.abnormal
                          ? "bg-accent-coral/15 text-accent-coral"
                          : "bg-sage-100 text-sage-700"
                      )}
                    >
                      <Bed className="w-5 h-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-clay-900">{patient.name}</p>
                        {patient.lastVitals?.abnormal && (
                          <Badge variant="coral" size="sm">needs review</Badge>
                        )}
                        {patient.dueMedicationCount > 0 && (
                          <Badge variant="gold" size="sm">{patient.dueMedicationCount} meds due</Badge>
                        )}
                      </div>
                      <p className="text-sm text-clay-600 truncate">
                        Bed {patient.bedNumber} · {patient.wardName} · {patient.diagnosis ?? "No diagnosis recorded"}
                      </p>
                      <p className="text-xs text-clay-500 mt-0.5">
                        {patient.medicalRecordNumber ?? "No MRN"}
                        {patient.bloodGroup ? ` · ${patient.bloodGroup}` : ""}
                        {patient.lastVitalsAt ? ` · Vitals ${formatTime(patient.lastVitalsAt)}` : " · No vitals yet"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:shrink-0">
                    <Button variant="ghost" size="sm" href={`/portal/nurse/patients?patient=${patient.id}`}>
                      Chart
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card padding="none">
          <CardHeader className="p-6 border-b border-cream-200 mb-0">
            <CardTitle>Pending Lab Orders</CardTitle>
            <p className="text-sm text-clay-600">Awaiting collection or result</p>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {(data.labOrders ?? []).length === 0 && !loading && (
              <p className="text-sm text-clay-500">No outstanding lab orders.</p>
            )}
            {(data.labOrders ?? []).map(order => (
              <div key={order.id} className="flex items-start gap-3 p-3 rounded-xl bg-cream-100 clay-card-inset">
                <span className="mt-0.5 w-5 h-5 rounded-md border border-cream-400 flex items-center justify-center flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-clay-900">{order.patientName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={order.priority === "URGENT" ? "coral" : "clay"} size="sm">{order.priority}</Badge>
                    <StatusBadge status={order.status} />
                    <span className="text-xs text-clay-500">ordered {formatDate(order.orderedAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card padding="none">
        <CardHeader className="p-6 border-b border-cream-200 mb-0">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Medication Administration Record</CardTitle>
              <p className="text-sm text-clay-600">Current round · {medStats.given}/{medStats.total} documented</p>
            </div>
            <Button variant="ghost" size="sm" href="/portal/nurse/medications">
              Full MAR
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={medColumns}
            rows={medications}
            rowKey={m => m.id}
            empty="No medication administrations recorded"
          />
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card padding="none">
          <CardHeader className="p-6 border-b border-cream-200 mb-0">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Latest Vitals</CardTitle>
                <p className="text-sm text-clay-600">Flagged values highlighted</p>
              </div>
              <Button variant="ghost" size="sm" href="/portal/nurse/vitals">
                Record
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={vitalColumns}
              rows={vitalRows}
              rowKey={v => v.id}
              empty="No vitals recorded for admitted patients"
            />
          </CardContent>
        </Card>

        <Card padding="md">
          <CardHeader className="pb-2">
            <CardTitle>Recent Nursing Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {notes.length === 0 && !loading && (
              <p className="text-sm text-clay-500">No nursing notes yet.</p>
            )}
            {notes.map((note: Note) => (
              <div key={note.id} className="p-3 rounded-xl bg-cream-100 clay-card-inset">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <p className="text-sm font-medium text-clay-900">
                    {nameByPatientId.get(note.patientId) ?? "Ward"}
                  </p>
                  <span className="text-xs text-clay-500">{formatTime(note.createdAt)}</span>
                </div>
                <p className="text-sm text-clay-600">{note.content}</p>
                <p className="text-xs text-clay-500 mt-2 flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  {note.noteType} · {note.authorName}
                </p>
              </div>
            ))}
            <Button variant="secondary" className="w-full" href="/portal/nurse/notes">
              <MessageSquare className="w-4 h-4" />
              Add nursing note
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {[
          {
            icon: Thermometer,
            label: "Abnormal vitals",
            value: escalated ? `${escalated} patient${escalated === 1 ? "" : "s"} outside range` : "All patients in range",
          },
          {
            icon: Wind,
            label: "Meds held",
            value: medStats.held ? `${medStats.held} awaiting review` : "None on hold",
          },
          {
            icon: Clock,
            label: "Handoff notes",
            value: `${notes.filter(n => n.noteType === "HANDOFF").length} recorded this shift`,
          },
        ].map(item => (
          <Card key={item.label} padding="sm" className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-sage-100 flex items-center justify-center flex-shrink-0">
              <item.icon className="w-5 h-5 text-sage-700" />
            </span>
            <div>
              <p className="text-xs text-clay-500">{item.label}</p>
              <p className="text-sm font-medium text-clay-900">{item.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <p className="text-xs text-clay-500 text-center">
        Last synced {formatDate(new Date())} · Live data from the demo database
      </p>
    </div>
  )
}
