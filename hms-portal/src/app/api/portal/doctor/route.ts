import { requireActor, withErrorHandling } from "@/server/authz"
import { buildDoctorPortal } from "@/server/queries/portal"

export const GET = withErrorHandling(async () => {
  const actor = await requireActor()
  if (actor.role !== "DOCTOR" || !actor.doctorId) {
    return Response.json({ error: "Only doctor accounts can read this resource" }, { status: 403 })
  }

  return Response.json(await buildDoctorPortal(actor.doctorId))
})
