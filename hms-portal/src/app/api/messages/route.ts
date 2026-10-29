import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { assertPatientVisible, doctorPatientIds, patientScope } from "@/server/assignment"
import { assertObjectId, AuthError, recordAudit, requireActor, withErrorHandling } from "@/server/authz"

const createSchema = z.object({
  recipientId: z.string().min(1),
  subject: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(4000),
  patientId: z.string().min(1).optional(),
})

const readSchema = z.object({ id: z.string().min(1) })

export const GET = withErrorHandling(async () => {
  const actor = await requireActor()
  if (actor.role !== "PATIENT" && actor.role !== "DOCTOR") {
    throw new AuthError("Insufficient permissions for this action", 403)
  }

  const messages = await prisma.message.findMany({
    where: {
      OR: [{ senderId: actor.userId }, { recipientId: actor.userId }],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      subject: true,
      body: true,
      createdAt: true,
      readAt: true,
      patientId: true,
      senderId: true,
      recipientId: true,
      sender: { select: { name: true } },
      recipient: { select: { name: true } },
      patient: { select: { id: true, user: { select: { id: true, name: true } } } },
    },
  })

  return Response.json({
    messages: messages.map(row => ({
      id: row.id,
      subject: row.subject,
      body: row.body,
      createdAt: row.createdAt,
      readAt: row.readAt,
      read: row.readAt != null,
      direction: row.recipientId === actor.userId ? "incoming" : "outgoing",
      senderId: row.senderId,
      recipientId: row.recipientId,
      senderName: row.sender.name,
      recipientName: row.recipient.name,
      patientId: row.patientId ?? row.patient?.id ?? null,
      patientName: row.patient?.user.name ?? null,
      patientUserId: row.patient?.user.id ?? null,
    })),
  })
})

export const POST = withErrorHandling(async (request: Request) => {
  const actor = await requireActor()
  const body = createSchema.parse(await request.json())
  assertObjectId(body.recipientId, "recipient id")

  if (actor.role === "PATIENT") {
    if (!actor.patientId) throw new AuthError("Your account is not linked to a patient record", 403)

    const doctor = await prisma.doctor.findUnique({
      where: { userId: body.recipientId },
      select: { id: true },
    })
    if (!doctor) throw new AuthError("Choose a physician on your care team", 400)

    const panel = await doctorPatientIds(doctor.id)
    if (!panel.includes(actor.patientId)) {
      throw new AuthError("That physician is not on your care team", 403)
    }

    const message = await prisma.message.create({
      data: {
        senderId: actor.userId,
        recipientId: body.recipientId,
        patientId: actor.patientId,
        subject: body.subject,
        body: body.body,
      },
    })
    await recordAudit(actor, "CREATE", "Message", message.id, { recipientId: body.recipientId }, request)
    return Response.json({ message }, { status: 201 })
  }

  if (actor.role === "DOCTOR") {
    if (!actor.doctorId) throw new AuthError("Your account is not linked to a doctor profile", 403)
    if (!body.patientId) throw new AuthError("Choose a patient on your panel", 400)
    assertObjectId(body.patientId, "patient id")
    assertPatientVisible(await patientScope(actor), body.patientId)

    const patient = await prisma.patient.findUnique({
      where: { id: body.patientId },
      select: { id: true, userId: true },
    })
    if (!patient) throw new AuthError("Patient not found", 404)
    if (patient.userId !== body.recipientId) {
      throw new AuthError("Reply to the patient account on this chart", 400)
    }

    const message = await prisma.message.create({
      data: {
        senderId: actor.userId,
        recipientId: body.recipientId,
        patientId: patient.id,
        subject: body.subject,
        body: body.body,
      },
    })
    await recordAudit(actor, "CREATE", "Message", message.id, { patientId: patient.id }, request)
    return Response.json({ message }, { status: 201 })
  }

  throw new AuthError("Only a patient or physician can send a care-team message", 403)
})

export const PATCH = withErrorHandling(async (request: Request) => {
  const actor = await requireActor()
  const body = readSchema.parse(await request.json())
  assertObjectId(body.id, "message id")

  const updated = await prisma.message.updateMany({
    where: { id: body.id, recipientId: actor.userId, readAt: null },
    data: { readAt: new Date() },
  })

  return Response.json({ updated: updated.count })
})
