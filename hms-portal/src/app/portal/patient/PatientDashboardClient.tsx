"use client"

import { motion } from "framer-motion"
import {
  Calendar, Heart, FileText, Pill, MessageSquare, Plus,
  ChevronRight, CheckCircle, Clock, AlertTriangle, Shield
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { formatDate } from "@/lib/utils"
import { PortalState } from "@/components/portal/PortalState"
import { usePatientPortal } from "@/lib/use-portal-data"

const formatTime = (value: string | Date) =>
  new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })

export function PatientDashboardClient() {
  const { data, loading, error } = usePatientPortal()

  const firstName = data.profile?.name?.split(" ")[0] ?? "there"
  const latest = data.latestVitals

  const healthMetrics = [
    {
      label: "Blood Pressure",
      value: latest?.systolic && latest?.diastolic ? `${latest.systolic}/${latest.diastolic}` : "—",
      unit: "mmHg",
      trend: latest?.abnormal ? "up" : "stable",
      range: "<120/80",
    },
    {
      label: "Heart Rate",
      value: latest?.heartRate ? String(latest.heartRate) : "—",
      unit: "bpm",
      trend: latest?.abnormal ? "up" : "stable",
      range: "60-100",
    },
    {
      label: "Oxygen Saturation",
      value: latest?.oxygenSaturation ? String(latest.oxygenSaturation) : "—",
      unit: "%",
      trend: latest?.abnormal ? "up" : "stable",
      range: "95-100",
    },
    {
      label: "Temperature",
      value: latest?.temperature ? String(latest.temperature) : "—",
      unit: "°C",
      trend: latest?.abnormal ? "up" : "stable",
      range: "36.0-38.0",
    },
  ]

  const upcomingAppointments = (data.appointments ?? [])
    .filter(a => a.upcoming)
    .slice(0, 3)

  const recentResults = (data.results ?? []).slice(0, 3)

  const medications = (data.prescriptions ?? [])
    .flatMap(rx =>
      rx.items.map(item => ({
        id: item.id,
        name: item.drugName,
        dosage: item.dosage,
        frequency: item.frequency,
        prescriber: rx.prescriberName,
        refills: item.refillsLeft,
        nextRefill: rx.expiresAt,
      }))
    )
    .slice(0, 4)

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
          <h1 className="text-3xl font-semibold tracking-tight text-[#2F3E2E]">Hello, {firstName}</h1>
          <p className="text-[#5A6B57] mt-1">Here&rsquo;s how you&rsquo;re doing today.</p>
        </div>
        <Button href="/portal/patient/appointments/new" className="ml-auto">
          <Plus className="w-4 h-4 mr-2" />
          Book Appointment
        </Button>
      </motion.div>

      {error && (
        <p role="alert" className="text-sm text-[var(--accent-coral)]">
          Could not load your dashboard{error ? ` (request ${error})` : ""}. Pull to refresh or try again shortly.
        </p>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {healthMetrics.map((metric, index) => (
          <motion.div key={metric.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
            <Card padding="md" className="h-full">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-clay-500 mb-1">{metric.label}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-2xl font-bold text-clay-900">{loading ? "—" : metric.value}</span>
                    <span className="text-clay-500">{metric.unit}</span>
                  </div>
                  <p className="text-xs text-clay-500 mt-1">Reference: {metric.range}</p>
                </div>
                <Badge variant={metric.trend === "up" ? "coral" : metric.trend === "down" ? "sage" : "clay"}>
                  {metric.trend === "up" && <AlertTriangle className="w-3 h-3 mr-1" />}
                  {metric.trend === "down" && <CheckCircle className="w-3 h-3 mr-1" />}
                  {metric.trend === "stable" && <Clock className="w-3 h-3 mr-1" />}
                  {metric.trend === "up" ? "abnormal" : "stable"}
                </Badge>
              </div>
            </Card>
          </motion.div>
        ))}
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
                  <CardTitle>Upcoming Appointments</CardTitle>
                  <p className="text-clay-600 text-sm">Your next scheduled visits</p>
                </div>
                <Button variant="ghost" size="sm" href="/portal/patient/appointments">
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-cream-200">
                {upcomingAppointments.length === 0 && !loading && (
                  <p className="p-6 text-sm text-clay-500">You have no upcoming appointments.</p>
                )}
                {upcomingAppointments.map((apt, index) => (
                  <motion.div
                    key={apt.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 hover:bg-cream-50 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-14 h-14 rounded-xl bg-sage-100 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-6 h-6 text-sage-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium text-clay-900">{apt.doctorName}</h4>
                          {apt.doctorSpecialization && (
                            <Badge variant="sage" className="text-xs">{apt.doctorSpecialization}</Badge>
                          )}
                          <Badge
                            variant={apt.status === "CONFIRMED" ? "sage" : apt.status === "SCHEDULED" ? "gold" : "clay"}
                            className="text-xs lowercase"
                          >
                            {apt.status.toLowerCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-clay-600">{apt.reason ?? "Consultation"} • {apt.duration} min</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-clay-600 flex-wrap">
                      <span className="flex items-center gap-1 font-medium text-clay-900">
                        <Clock className="w-4 h-4" />
                        {formatDate(apt.scheduledAt)} at {formatTime(apt.scheduledAt)}
                      </span>
                      <Button variant="ghost" size="sm" href="/portal/patient/appointments">Details</Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="border-t border-cream-200">
              <Button variant="secondary" href="/portal/patient/appointments/new" className="w-full sm:w-auto">
                Schedule New Appointment
              </Button>
            </CardFooter>
          </Card>

          <Card padding="none">
            <CardHeader className="p-6 border-b border-cream-200">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Test Results</CardTitle>
                  <p className="text-clay-600 text-sm">Latest lab work and diagnostics</p>
                </div>
                <Button variant="ghost" size="sm" href="/portal/patient/records">
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-cream-200">
                {recentResults.length === 0 && !loading && (
                  <p className="p-6 text-sm text-clay-500">No results have been released yet.</p>
                )}
                {recentResults.map((result, index) => {
                  const abnormal = result.flag != null && result.flag !== "NORMAL"
                  return (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 hover:bg-cream-50 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-14 h-14 rounded-xl bg-[color-mix(in_srgb,_var(--accent-coral)_15%,_transparent)] flex items-center justify-center flex-shrink-0">
                          <FileText className="w-6 h-6 text-[var(--accent-coral)]" />
                        </div>
                        <div>
                          <h4 className="font-medium text-clay-900">{result.testName}</h4>
                          <p className="text-sm text-clay-600">
                            {result.result ?? "—"} {result.unit ?? ""} • {formatDate(result.completedAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={abnormal ? "coral" : "sage"} className="capitalize">
                          {abnormal ? "Review Needed" : "Normal"}
                        </Badge>
                        <Button variant="ghost" size="sm" href="/portal/patient/results">View</Button>
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Current Medications</CardTitle>
                  <p className="text-clay-600 text-sm">Active prescriptions</p>
                </div>
                <Button variant="ghost" size="sm" href="/portal/patient/medications">
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-cream-200">
                {medications.length === 0 && !loading && (
                  <p className="p-6 text-sm text-clay-500">You have no active prescriptions.</p>
                )}
                {medications.map((med, index) => (
                  <motion.div
                    key={med.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 hover:bg-cream-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium text-clay-900">{med.name}</h4>
                          <Badge variant="clay" className="text-xs">{med.dosage}</Badge>
                        </div>
                        <p className="text-sm text-clay-600 mt-1">{med.frequency}</p>
                        <p className="text-xs text-clay-500 mt-1">Prescribed by {med.prescriber ?? "your care team"}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <Badge variant={med.refills > 0 ? "sage" : "coral"} className="mb-1">
                          {med.refills > 0 ? `${med.refills} refills left` : "Refill needed"}
                        </Badge>
                        {med.nextRefill && (
                          <p className="text-xs text-clay-500">Refill by {formatDate(med.nextRefill)}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card padding="md">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="secondary" className="w-full justify-start gap-3" href="/portal/patient/messages/new">
                <MessageSquare className="w-5 h-5" />
                <span>Message Care Team</span>
              </Button>
              <Button variant="secondary" className="w-full justify-start gap-3" href="/portal/patient/records/request">
                <FileText className="w-5 h-5" />
                <span>Request Records</span>
              </Button>
              <Button variant="secondary" className="w-full justify-start gap-3" href="/portal/patient/prescriptions/refill">
                <Pill className="w-5 h-5" />
                <span>Request Refill</span>
              </Button>
              <Button variant="secondary" className="w-full justify-start gap-3" href="/portal/patient/insurance">
                <Shield className="w-5 h-5" />
                <span>Update Insurance</span>
              </Button>
            </CardContent>
          </Card>

          <Card padding="md" className="bg-sage-50 border border-sage-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-sage-100 flex items-center justify-center flex-shrink-0">
                <Heart className="w-5 h-5 text-sage-600" />
              </div>
              <div>
                <h4 className="font-semibold text-clay-900 mb-1">Preventive Care Reminder</h4>
                <p className="text-sm text-clay-600 mb-3">
                  You&rsquo;re due for your annual wellness visit. Schedule now to stay on track with your health goals.
                </p>
                <Button size="sm" href="/portal/patient/appointments/new?type=wellness">
                  Schedule Wellness Visit
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
