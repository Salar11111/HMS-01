"use client"

import { motion } from "framer-motion"
import {
  Calendar, Users, FileText, Plus,
  ChevronRight, AlertTriangle, Activity, Pill, MessageSquare
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { cn } from "@/lib/utils"
import { PortalState } from "@/components/portal/PortalState"
import { useDoctorPortal } from "@/lib/use-portal-data"

const formatTime = (value: string | Date) =>
  new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })

/** Derives an age label from a date of birth. */
const ageFrom = (dob: string | Date | null | undefined) => {
  if (!dob) return null
  const diff = Date.now() - new Date(dob).getTime()
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000))
}

export function DoctorDashboardClient() {
  const { data, loading, error } = useDoctorPortal()

  const stats = data.stats
  const schedule = data.todaysAppointments ?? []
  const patients = data.patients ?? []
  const alerts = (data.abnormalResults ?? []).filter(r => r.flag === "CRITICAL" || r.flag === "HIGH")

  const checkedIn = schedule.filter(a => a.status === "COMPLETED" || a.status === "IN_PROGRESS").length

  const pendingTasks = [
    { type: "Chart Review", count: stats?.todayRecordCount ?? 0, priority: "high", label: "Notes to complete" },
    { type: "Lab Results", count: stats?.abnormalResultCount ?? 0, priority: "medium", label: "Awaiting review" },
    { type: "Prescriptions", count: (data.prescriptions ?? []).filter(p => p.status === "ACTIVE").length, priority: "low", label: "Active prescriptions" },
    { type: "Messages", count: stats?.unreadMessages ?? 0, priority: "medium", label: "Patient messages" },
  ]

  const firstName = data.profile?.name?.replace(/^Dr\.\s*/, "") ?? "Doctor"

  if (loading) return <PortalState loading />
  if (error || !data.profile) return <PortalState error={error} />

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="font-display text-2xl font-semibold text-clay-900">Physician Dashboard</h1>
          <p className="text-clay-600 mt-1">
            Good day, Dr. {firstName}. You have {stats?.todayAppointments ?? 0} appointment{stats?.todayAppointments === 1 ? "" : "s"} today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" className="gap-2" href="/portal/doctor/ehr/new">
            <Plus className="w-4 h-4" />
            New Note
          </Button>
          <Button className="gap-2" href="/portal/doctor/patients/new">
            <Plus className="w-4 h-4" />
            New Patient
          </Button>
        </div>
      </motion.div>

      {error && (
        <p role="alert" className="text-sm text-[var(--accent-coral)]">
          Could not load your dashboard (request {error}). Please refresh to try again.
        </p>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <Card padding="md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-clay-500 mb-1">Patients Today</p>
              <p className="font-display text-3xl font-bold text-clay-900">
                {loading ? "—" : (stats?.todayAppointments ?? 0)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-sage-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-sage-600" />
            </div>
          </div>
          <p className="mt-3 text-sm text-clay-600">
            {checkedIn} seen · {schedule.length - checkedIn} remaining
          </p>
        </Card>
        <Card padding="md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-clay-500 mb-1">Charts to Complete</p>
              <p className="font-display text-3xl font-bold text-clay-900">
                {loading ? "—" : (stats?.todayRecordCount ?? 0)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[color-mix(in_srgb,_var(--accent-coral)_15%,_transparent)] flex items-center justify-center">
              <FileText className="w-6 h-6 text-[var(--accent-coral)]" />
            </div>
          </div>
          <p className="mt-3 text-sm text-clay-600">Notes filed today</p>
        </Card>
        <Card padding="md">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-clay-500 mb-1">Abnormal Results</p>
              <p className="font-display text-3xl font-bold text-clay-900">
                {loading ? "—" : (stats?.abnormalResultCount ?? 0)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[color-mix(in_srgb,_var(--accent-gold)_15%,_transparent)] flex items-center justify-center">
              <Activity className="w-6 h-6 text-[var(--accent-gold)]" />
            </div>
          </div>
          <p className="mt-3 text-sm text-clay-600">
            {alerts.length} high-priority value{alerts.length === 1 ? "" : "s"}
          </p>
        </Card>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="lg:col-span-2 space-y-6"
        >
          <Card padding="none">
            <CardHeader className="p-6 border-b border-cream-200">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Today&rsquo;s Schedule</CardTitle>
                  <p className="text-clay-600 text-sm">
                    {data.profile?.departmentName ?? "Clinic"}
                    {data.profile?.specialization ? ` • ${data.profile.specialization}` : ""}
                  </p>
                </div>
                <Button variant="ghost" size="sm" href="/portal/doctor/schedule">
                  Full Schedule <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-cream-200">
                {schedule.length === 0 && !loading && (
                  <p className="p-6 text-sm text-clay-500">No appointments scheduled for today.</p>
                )}
                {schedule.map((apt, index) => (
                  <motion.div
                    key={apt.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 hover:bg-cream-50 transition-colors flex flex-col sm:flex-row sm:items-center gap-4"
                  >
                    <div className={cn(
                      "w-20 h-20 rounded-xl flex items-center justify-center flex-shrink-0 text-clay-900 font-medium",
                      apt.past ? "bg-sage-100" : "bg-cream-100"
                    )}>
                      {formatTime(apt.scheduledAt)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-clay-900">{apt.patientName}</h4>
                        <Badge
                          variant={apt.status === "CONFIRMED" || apt.status === "COMPLETED" ? "sage" : apt.status === "CANCELLED" || apt.status === "NO_SHOW" ? "coral" : "gold"}
                          className="text-xs lowercase"
                        >
                          {apt.status.toLowerCase().replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-sm text-clay-600 mt-1">
                        {apt.reason ?? "Consultation"} • {apt.duration} min
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" className="gap-1" href={`/portal/doctor/ehr/${apt.patientId}`}>
                        <FileText className="w-4 h-4" />
                        Open Chart
                      </Button>
                      <Button variant="ghost" size="sm" href="/portal/doctor/schedule">Details</Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card padding="none">
            <CardHeader className="p-6 border-b border-cream-200">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Patients</CardTitle>
                  <p className="text-clay-600 text-sm">Quick access to charts</p>
                </div>
                <Button variant="ghost" size="sm" href="/portal/doctor/patients">
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-cream-200">
                {patients.length === 0 && !loading && (
                  <p className="p-6 text-sm text-clay-500">No patients on file yet.</p>
                )}
                {patients.slice(0, 5).map((patient, index) => {
                  const age = ageFrom(patient.dateOfBirth)
                  return (
                    <motion.div
                      key={patient.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 hover:bg-cream-50 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-sage-100 flex items-center justify-center">
                          <span className="text-sm font-semibold text-sage-700">
                            {patient.name?.split(" ").map(n => n[0]).join("")}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium text-clay-900">{patient.name}</h4>
                          <p className="text-sm text-clay-600">
                            {patient.medicalRecordNumber ?? "No MRN"}
                            {age ? ` • ${age} yrs` : ""}
                            {patient.bloodGroup ? ` • ${patient.bloodGroup}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={patient.admitted ? "gold" : "sage"} className="capitalize">
                          {patient.admitted
                            ? `Admitted${patient.wardName ? ` • ${patient.wardName}` : ""}`
                            : "Outpatient"}
                        </Badge>
                        <Button size="sm" variant="ghost" href={`/portal/doctor/ehr/${patient.id}`}>
                          Open Chart
                        </Button>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="space-y-6"
        >
          <Card padding="none">
            <CardHeader className="p-6 border-b border-cream-200">
              <CardTitle>Pending Tasks</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-cream-200">
                {pendingTasks.map((task, index) => (
                  <motion.div
                    key={task.type}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 hover:bg-cream-50 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        task.priority === "high" ? "bg-[color-mix(in_srgb,_var(--accent-coral)_15%,_transparent)]" :
                        task.priority === "medium" ? "bg-[color-mix(in_srgb,_var(--accent-gold)_15%,_transparent)]" :
                        "bg-sage-100"
                      )}>
                        {task.type === "Chart Review" && <FileText className="w-5 h-5" style={{ color: task.priority === "high" ? "var(--accent-coral)" : "var(--accent-gold)" }} />}
                        {task.type === "Lab Results" && <Activity className="w-5 h-5" style={{ color: task.priority === "high" ? "var(--accent-coral)" : "var(--accent-gold)" }} />}
                        {task.type === "Prescriptions" && <Pill className="w-5 h-5" style={{ color: task.priority === "high" ? "var(--accent-coral)" : "var(--accent-gold)" }} />}
                        {task.type === "Messages" && <MessageSquare className="w-5 h-5" style={{ color: task.priority === "high" ? "var(--accent-coral)" : "var(--accent-gold)" }} />}
                      </div>
                      <div>
                        <p className="font-medium text-clay-900">{task.type}</p>
                        <p className="text-sm text-clay-600">{task.label}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={task.priority === "high" ? "coral" : task.priority === "medium" ? "gold" : "clay"} className="capitalize">
                        {task.priority}
                      </Badge>
                      <span className="w-8 h-8 rounded-xl bg-cream-100 flex items-center justify-center text-clay-900 font-bold text-sm">
                        {task.count}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="border-t border-cream-200">
              <Button variant="secondary" className="w-full" href="/portal/doctor/tasks">
                View All Tasks
              </Button>
            </CardFooter>
          </Card>

          {alerts.length > 0 && (
            <Card padding="md" className="bg-[color-mix(in_srgb,_var(--accent-coral)_8%,_transparent)] border border-[color-mix(in_srgb,_var(--accent-coral)_30%,_transparent)]">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[color-mix(in_srgb,_var(--accent-coral)_20%,_transparent)] flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-[var(--accent-coral)]" />
                </div>
                <div>
                  <h4 className="font-semibold text-clay-900 mb-1">Critical Lab Alert</h4>
                  <p className="text-sm text-clay-600 mb-3">
                    {alerts[0].patientName} &mdash; {alerts[0].testName}: {alerts[0].result} {alerts[0].unit ?? ""}
                    {alerts[0].referenceRange ? ` (ref: ${alerts[0].referenceRange})` : ""}. Requires review.
                  </p>
                  <Button size="sm" variant="primary" href={`/portal/doctor/ehr/${alerts[0].patientId}`}>
                    Review Now
                  </Button>
                </div>
              </div>
            </Card>
          )}

          <Card padding="md">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="secondary" className="w-full justify-start gap-3" href="/portal/doctor/ehr/templates">
                <FileText className="w-5 h-5" />
                <span>Note Templates</span>
              </Button>
              <Button variant="secondary" className="w-full justify-start gap-3" href="/portal/doctor/orders">
                <Pill className="w-5 h-5" />
                <span>Order Sets</span>
              </Button>
              <Button variant="secondary" className="w-full justify-start gap-3" href="/portal/doctor/referrals">
                <Users className="w-5 h-5" />
                <span>Referrals</span>
              </Button>
              <Button variant="secondary" className="w-full justify-start gap-3" href="/portal/doctor/schedule/block">
                <Calendar className="w-5 h-5" />
                <span>Block Time</span>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
