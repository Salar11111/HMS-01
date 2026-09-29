"use client"

import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { PageHeader, StatCard } from "@/components/portal/PageHeader"
import { PortalState } from "@/components/portal/PortalState"
import { useAdminPortal } from "@/lib/use-portal-data"
import { formatCurrency } from "@/lib/utils"

export default function AdminReportsPage() {
  const { data, loading, error } = useAdminPortal()
  if (loading) return <PortalLayout role="admin"><PortalState loading /></PortalLayout>
  if (error || !data.stats) return <PortalLayout role="admin"><PortalState error={error} /></PortalLayout>

  const collected = data.revenueByMonth.reduce((sum, month) => sum + month.collected, 0)

  return (
    <PortalLayout role="admin">
      <div className="space-y-6">
        <PageHeader title="Reports" description="Collected revenue by month and current capacity" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Collected (6 mo)" value={formatCurrency(collected)} />
          <StatCard label="Open appointments" value={String(data.stats.openAppointments)} />
          <StatCard label="Bed occupancy" value={`${data.stats.bedOccupancyRate}%`} />
        </div>
        <Card>
          <CardHeader><CardTitle>Revenue by month</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {data.revenueByMonth.map(month => (
                <li key={month.month} className="flex justify-between gap-4">
                  <span className="font-medium text-clay-900">{month.month}</span>
                  <span className="text-clay-600">{formatCurrency(month.collected)} collected of {formatCurrency(month.total)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  )
}
