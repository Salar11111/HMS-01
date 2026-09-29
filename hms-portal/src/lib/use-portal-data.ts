"use client"

import { useApiData } from "@/lib/use-api-data"
import type {
  AdminPortalData,
  DoctorPortalData,
  NursePortalData,
  PatientPortalData,
} from "@/server/queries/portal"

/**
 * Typed wrappers around `useApiData` for the four role dashboards.
 *
 * Each role gets one read-model endpoint, so pages can subscribe to the whole
 * payload with a stable key. The fallbacks are empty objects: dashboards render
 * their loading state first and only read into the payload afterwards, so an
 * empty object never reaches the DOM.
 */

const emptyPatient = {} as unknown as PatientPortalData
const emptyDoctor = {} as unknown as DoctorPortalData
const emptyNurse = {} as unknown as NursePortalData
const emptyAdmin = {} as unknown as AdminPortalData

export function usePatientPortal() {
  return useApiData<PatientPortalData>("/api/portal/patient", emptyPatient)
}

export function useDoctorPortal() {
  return useApiData<DoctorPortalData>("/api/portal/doctor", emptyDoctor)
}

export function useNursePortal() {
  return useApiData<NursePortalData>("/api/portal/nurse", emptyNurse)
}

export function useAdminPortal() {
  return useApiData<AdminPortalData>("/api/portal/admin", emptyAdmin)
}
