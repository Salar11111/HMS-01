"use client"

import {
  Activity, AlertTriangle, ArrowRight, Banknote, Bed, Building2, CalendarClock,
  FileWarning, FlaskConical, Package, Shield, TrendingUp, Users,
} from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { DataTable, StatusBadge, type Column } from "@/components/portal/DataTable"
import { PageHeader, StatCard } from "@/components/portal/PageHeader"
import { PortalState } from "@/components/portal/PortalState"
import { useAdminPortal } from "@/lib/use-portal-data"
import type { AdminPortalData } from "@/server/queries/portal"
import { cn, formatCurrency, formatDate, formatTime } from "@/lib/utils"

type Invoice = NonNullable<AdminPortalData["invoices"]>[number]
type LabQueueItem = NonNullable<AdminPortalData["labQueue"]>[number]

export function AdminDashboardClient() {
  const { data, loading, error } = useAdminPortal()

  const stats = data.stats
  const invoices = data.invoices ?? []
  const wards = data.wards ?? []
  const labQueue = data.labQueue ?? []
  const revenue = data.revenueByMonth ?? []

  const totalBeds = stats?.totalBeds ?? 0
  const totalOccupied = stats?.occupiedBeds ?? 0

  const lowStock = stats?.lowStockCount ?? 0
  const overdueInvoices = invoices.filter(i => i.overdue).length
  const pendingLeave = stats?.pendingLeaveCount ?? 0
  const equipmentOverdue = stats?.overdueMaintenanceCount ?? 0

  const totalRevenue = revenue.reduce((sum, m) => sum + m.collected, 0)
  const maxRevenue = Math.max(1, ...revenue.map(m => m.total))

  const statCards = [
    {
      label: "Total Revenue (6mo)",
      value: loading ? "—" : formatCurrency(totalRevenue),
      delta: `${invoices.length} open invoices`,
      tone: "sage",
    },
    {
      label: "Outstanding Balance",
      value: loading ? "—" : formatCurrency(stats?.outstandingBalance ?? 0),
      delta: `${overdueInvoices} overdue`,
      tone: overdueInvoices > 0 ? "coral" : "sage",
    },
    {
      label: "Bed Occupancy",
      value: loading ? "—" : `${stats?.bedOccupancyRate ?? 0}%`,
      delta: `${totalOccupied}/${totalBeds} beds in use`,
      tone: (stats?.bedOccupancyRate ?? 0) >= 85 ? "coral" : "gold",
    },
    {
      label: "Active Staff",
      value: loading ? "—" : String(stats?.userCount ?? 0),
      delta: `${stats?.departmentCount ?? 0} departments`,
      tone: "clay",
    },
  ]

  const invoiceColumns: Column<Invoice>[] = [
    {
      key: "id",
      header: "Invoice",
      render: i => <span className="font-medium text-clay-900">{i.invoiceNumber}</span>,
    },
    { key: "patient", header: "Patient", render: i => <span>{i.patientName}</span> },
    { key: "total", header: "Total", align: "right", render: i => <span className="font-medium">{formatCurrency(i.totalAmount)}</span> },
    {
      key: "outstanding",
      header: "Outstanding",
      align: "right",
      render: i => (
        <span className={cn(i.balance > 0 && "text-accent-coral font-medium")}>
          {formatCurrency(i.balance)}
        </span>
      ),
    },
    { key: "due", header: "Due", render: i => <span className="text-clay-600">{i.dueAt ? formatDate(i.dueAt) : "—"}</span> },
    { key: "status", header: "Status", render: i => <StatusBadge status={i.status} /> },
  ]

  const labColumns: Column<LabQueueItem>[] = [
    {
      key: "tests",
      header: "Test",
      render: l => <span className="font-medium text-clay-900">{l.tests.join(", ") || "—"}</span>,
    },
    { key: "patient", header: "Patient", render: l => <span className="text-clay-600">{l.patientName}</span> },
    { key: "priority", header: "Priority", render: l => <StatusBadge status={l.priority} /> },
    { key: "status", header: "Status", render: l => <StatusBadge status={l.status} /> },
    { key: "ordered", header: "Ordered", align: "right", render: l => <span className="text-clay-500 text-xs">{formatTime(l.orderedAt)}</span> },
  ]

  const shortcuts = [
    { href: "/portal/admin/billing", icon: Banknote, label: "Billing & Claims", hint: `${overdueInvoices} need attention` },
    { href: "/portal/admin/wards", icon: Bed, label: "Ward & Beds", hint: `${totalOccupied}/${totalBeds} occupied` },
    { href: "/portal/admin/laboratory", icon: FlaskConical, label: "Laboratory", hint: `${labQueue.length} orders in queue` },
    { href: "/portal/admin/pharmacy", icon: Package, label: "Pharmacy", hint: "Batch & expiry control" },
    { href: "/portal/admin/inventory", icon: Package, label: "Inventory", hint: `${lowStock} items need action` },
    { href: "/portal/admin/hr", icon: Users, label: "Staff & HR", hint: `${pendingLeave} leave requests` },
    { href: "/portal/admin/equipment", icon: Activity, label: "Equipment", hint: `${equipmentOverdue} overdue service` },
    { href: "/portal/admin/reports", icon: TrendingUp, label: "Reports", hint: "Throughput & revenue" },
  ]

  if (loading) return <PortalState loading />
  if (error || !data.stats) return <PortalState error={error} />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administration Dashboard"
        description="Hospital operations overview — finance, capacity, workforce and compliance"
        actions={
          <>
            <Button variant="secondary" href="/portal/admin/reports">
              <TrendingUp className="w-4 h-4" />
              Reports
            </Button>
            <Button href="/portal/admin/compliance">
              <Shield className="w-4 h-4" />
              Compliance
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
        {statCards.map(stat => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            hint={stat.delta}
            accent={stat.tone as "sage" | "coral" | "gold" | "clay"}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {shortcuts.map(shortcut => (
          <Link
            key={shortcut.href}
            href={shortcut.href}
            className="clay-card p-4 flex items-center gap-3 group transition-shadow hover:shadow-clay-lg"
          >
            <span className="w-10 h-10 rounded-xl bg-sage-100 flex items-center justify-center flex-shrink-0 group-hover:bg-sage-200 transition-colors">
              <shortcut.icon className="w-5 h-5 text-sage-700" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-clay-900 truncate">{shortcut.label}</p>
              <p className="text-xs text-clay-500 truncate">{shortcut.hint}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-clay-400 ml-auto group-hover:translate-x-1 transition-transform flex-shrink-0" />
          </Link>
        ))}
      </div>

      <div className="grid xl:grid-cols-3 gap-6">
        <Card padding="md" className="xl:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Revenue Trend</CardTitle>
                <p className="text-sm text-clay-600">Six-month billed vs collected revenue</p>
              </div>
              <Badge variant="sage">{formatCurrency(totalRevenue)} collected</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3 h-48">
              {revenue.length === 0 && !loading && (
                <p className="text-sm text-clay-500">No invoices in the last six months.</p>
              )}
              {revenue.map(month => {
                const outstanding = Math.max(0, month.total - month.collected)
                return (
                  <div key={month.month} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-xs text-clay-500">{formatCurrency(month.total)}</span>
                    <div
                      className="w-full flex flex-col justify-end rounded-t-lg overflow-hidden"
                      style={{ height: `${(month.total / maxRevenue) * 100}%` }}
                    >
                      {month.total > 0 && (
                        <div className="w-full bg-accent-gold" style={{ height: `${(outstanding / month.total) * 100}%` }} />
                      )}
                      <div
                        className="w-full bg-sage-500"
                        style={{ height: month.total > 0 ? `${(month.collected / month.total) * 100}%` : "100%" }}
                      />
                    </div>
                    <span className="text-xs font-medium text-clay-700">{month.month}</span>
                  </div>
                )
              })}
            </div>
            <div className="flex flex-wrap gap-4 mt-4 text-xs text-clay-600">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-sage-500" /> Collected</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-accent-gold" /> Outstanding</span>
            </div>
          </CardContent>
        </Card>

        <Card padding="md">
          <CardHeader>
            <CardTitle>Bed Occupancy</CardTitle>
            <p className="text-sm text-clay-600">{totalOccupied} of {totalBeds} beds in use</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {wards.length === 0 && !loading && (
              <p className="text-sm text-clay-500">No wards configured.</p>
            )}
            {wards.map(ward => {
              const pct = ward.total > 0 ? (ward.occupied / ward.total) * 100 : 0
              return (
                <div key={ward.id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-clay-900 flex items-center gap-1.5">
                      {ward.isIcu && <Badge variant="coral" size="sm">ICU</Badge>}
                      {ward.name}
                    </span>
                    <span className="text-clay-500 text-xs">{ward.occupied}/{ward.total}</span>
                  </div>
                  <div className="h-2 rounded-full bg-cream-200 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", pct >= 85 ? "bg-accent-coral" : pct >= 60 ? "bg-accent-gold" : "bg-sage-500")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
            <Button variant="secondary" className="w-full" href="/portal/admin/wards">
              Manage beds
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card padding="none">
        <CardHeader className="p-6 border-b border-cream-200 mb-0">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Revenue Cycle</CardTitle>
              <p className="text-sm text-clay-600">Open invoices requiring follow-up</p>
            </div>
            <Button variant="ghost" size="sm" href="/portal/admin/billing">
              Open billing <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable columns={invoiceColumns} rows={invoices} rowKey={i => i.id} empty="No invoices on file" />
        </CardContent>
      </Card>

      <div className="grid xl:grid-cols-3 gap-6">
        <Card padding="none" className="xl:col-span-2">
          <CardHeader className="p-6 border-b border-cream-200 mb-0">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Laboratory Queue</CardTitle>
                <p className="text-sm text-clay-600">All departments · urgent first</p>
              </div>
              <Button variant="ghost" size="sm" href="/portal/admin/laboratory">
                Open lab
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable columns={labColumns} rows={labQueue} rowKey={l => l.id} empty="Laboratory queue is clear" />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card padding="md">
            <CardHeader className="pb-2">
              <CardTitle>Attention Required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { icon: FileWarning, label: "Invoices overdue", value: overdueInvoices, tone: "coral", href: "/portal/admin/billing" },
                { icon: Package, label: "Stock alerts", value: lowStock, tone: "gold", href: "/portal/admin/inventory" },
                { icon: CalendarClock, label: "Leave requests", value: pendingLeave, tone: "clay", href: "/portal/admin/hr" },
                { icon: AlertTriangle, label: "Equipment overdue service", value: equipmentOverdue, tone: "coral", href: "/portal/admin/equipment" },
              ].map(item => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-3 p-3 rounded-xl bg-cream-100 clay-card-inset hover:bg-cream-200 transition-colors"
                >
                  <span className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", item.tone === "coral" ? "bg-accent-coral/15 text-accent-coral" : item.tone === "gold" ? "bg-accent-gold/15 text-accent-gold" : "bg-clay-100 text-clay-700")}>
                    <item.icon className="w-4 h-4" />
                  </span>
                  <span className="text-sm text-clay-700 flex-1">{item.label}</span>
                  <span className="text-sm font-semibold text-clay-900">{item.value}</span>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card padding="md">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle>Audit Trail</CardTitle>
                <Button variant="ghost" size="sm" href="/portal/admin/compliance">
                  All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {(data.auditLog ?? []).length === 0 && !loading && (
                <p className="text-sm text-clay-500">No audit entries yet.</p>
              )}
              {(data.auditLog ?? []).slice(0, 4).map(entry => (
                <div key={entry.id} className="text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="clay" size="sm">{entry.action}</Badge>
                    <span className="font-medium text-clay-900">{entry.entity}</span>
                    <span className="text-xs text-clay-500 ml-auto">{formatTime(entry.createdAt)}</span>
                  </div>
                  <p className="text-xs text-clay-500 mt-1">{entry.userName}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card padding="md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-sage-600" />
            Branches
          </CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          {(data.branches ?? []).length === 0 && !loading && (
            <p className="text-sm text-clay-500">No branches configured.</p>
          )}
          {(data.branches ?? []).map(branch => (
            <div key={branch.id} className="p-4 rounded-xl bg-cream-100 clay-card-inset">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="font-medium text-clay-900">{branch.name}</p>
                <StatusBadge status={branch.isActive ? "ACTIVE" : "INACTIVE"} />
              </div>
              <p className="text-sm text-clay-600">{branch.code}{branch.address ? ` · ${branch.address}` : ""}</p>
              <p className="text-xs text-clay-500 mt-2">
                {branch.departmentCount} departments · {branch.wardCount} wards
                {branch.phone ? ` · ${branch.phone}` : ""}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
