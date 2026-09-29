import { requireActor, withErrorHandling } from "@/server/authz"
import { buildPatientPortal } from "@/server/queries/portal"

export const GET = withErrorHandling(async () => {
  const actor = await requireActor()
  if (actor.role !== "PATIENT" || !actor.patientId) {
    return Response.json({ error: "Only patient accounts can read this resource" }, { status: 403 })
  }

  return Response.json(await buildPatientPortal(actor.patientId))
})
