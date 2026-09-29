"use client"

import { PortalLayout } from "@/app/portal/_components/PortalLayout"
import { SettingsPanel } from "@/components/portal/SettingsPanel"

export default function PatientSettingsPage() {
  return (
    <PortalLayout role="patient">
      <SettingsPanel role="patient" />
    </PortalLayout>
  )
}
