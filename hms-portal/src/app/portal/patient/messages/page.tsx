"use client"

import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { Card, CardContent } from "@/components/ui/Card"
import { PageHeader } from "@/components/portal/PageHeader"
import { PortalState } from "@/components/portal/PortalState"
import { usePatientPortal } from "@/lib/use-portal-data"
import { formatDate, formatTime } from "@/lib/utils"

export default function PatientMessagesPage() {
  const { data, loading, error } = usePatientPortal()

  if (loading) return <PortalLayout role="patient"><PortalState loading /></PortalLayout>
  if (error || !data.profile) return <PortalLayout role="patient"><PortalState error={error} /></PortalLayout>

  return (
    <PortalLayout role="patient">
      <div className="space-y-6">
        <PageHeader title="Messages" description={`${data.unreadMessages} unread`} />
        {data.messages.length === 0 ? (
          <p className="text-sm text-clay-500">No messages.</p>
        ) : (
          <div className="space-y-3">
            {data.messages.map(message => (
              <Card key={message.id}>
                <CardContent className="p-4 space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-clay-900">{message.subject}</p>
                    <p className="text-xs text-clay-500">{formatDate(message.createdAt)} · {formatTime(message.createdAt)}</p>
                  </div>
                  <p className="text-xs text-clay-500">
                    {message.direction === "incoming" ? message.senderName : "You"} → {message.direction === "incoming" ? "You" : message.recipientName}
                    {message.read ? "" : " · Unread"}
                  </p>
                  <p className="text-sm text-clay-700">{message.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  )
}
