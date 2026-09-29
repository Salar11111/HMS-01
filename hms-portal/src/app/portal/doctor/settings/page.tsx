"use client"

import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { SettingsPanel } from "@/components/portal/SettingsPanel"

export default function DoctorSettingsPage() {
  return (
    <PortalLayout role="doctor">
      <SettingsPanel role="doctor" />
    </PortalLayout>
  )
}
