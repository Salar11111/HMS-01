import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { nurseCoversPatient } from "@/server/assignment"
import { assertObjectId, AuthError, recordAudit, requireRole, withErrorHandling } from "@/server/authz"

const schema = z.object({
  patientId: z.string().min(1),
  content: z.string().trim().min(1).max(4000),
  noteType: z.enum(["PROGRESS", "MEDICATION", "HANDOFF"]).default("PROGRESS"),
})

export const POST = withErrorHandling(async (request: Request) => {
  const actor = await requireRole("NURSE")
  if (!actor.nurseId) throw new AuthError("Your account is not linked to a nurse profile", 403)

  const body = schema.parse(await request.json())
  assertObjectId(body.patientId, "patient id")
  if (!(await nurseCoversPatient(actor.nurseId, body.patientId))) {
    throw new AuthError("This patient is not admitted to a ward in your department", 403)
  }

  const note = await prisma.nursingNote.create({
    data: {
      patientId: body.patientId,
      authorId: actor.userId,
      nurseId: actor.nurseId,
      noteType: body.noteType,
      content: body.content,
    },
  })

  await recordAudit(actor, "CREATE", "NursingNote", note.id, { noteType: body.noteType }, request)
  return Response.json({ note }, { status: 201 })
})
