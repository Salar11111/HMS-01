import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { nurseCoversPatient } from "@/server/assignment"
import {
  AuthError,
  assertObjectId,
  recordAudit,
  requireActor,
  withErrorHandling,
} from "@/server/authz"
import { ensureConsultationInvoice } from "@/server/billing"
import { assertDoctorSlotAvailable } from "@/server/slots"

const updateSchema = z.object({
  status: z.enum(["CONFIRMED", "COMPLETED", "NO_SHOW", "CANCELLED"]).optional(),
  notes: z.string().max(2000).optional(),
  reason: z.string().max(500).optional(),
  scheduledAt: z.coerce.date().optional(),
})

const CLOSED = new Set(["COMPLETED", "CANCELLED", "NO_SHOW"])

type Context = { params: Promise<{ id: string }> }

export const GET = withErrorHandling(async (_request: Request, ctx: Context) => {
  const actor = await requireActor()
  const { id } = await ctx.params
  assertObjectId(id, "appointment id")

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      patient: { select: { id: true, medicalRecordNumber: true, user: { select: { name: true } } } },
      doctor: { select: { id: true, specialization: true, user: { select: { name: true } } } },
      labOrders: true,
      prescriptions: true,
    },
  })

  if (!appointment) throw new AuthError("Appointment not found", 404)

  const isOwnerPatient =
    actor.role === "PATIENT" && appointment.patientId === actor.patientId
  const isAssignedDoctor =
    actor.role === "DOCTOR" && appointment.doctorId === actor.doctorId
  const isAssignedNurse =
    actor.role === "NURSE" &&
    actor.nurseId != null &&
    (await nurseCoversPatient(actor.nurseId, appointment.patientId))
  const isAdmin = actor.role === "ADMIN"

  if (!isOwnerPatient && !isAssignedDoctor && !isAssignedNurse && !isAdmin) {
    throw new AuthError("You do not have access to this appointment", 403)
  }

  return Response.json({ appointment })
})

export const PATCH = withErrorHandling(async (request: Request, ctx: Context) => {
  const actor = await requireActor()
  const { id } = await ctx.params
  assertObjectId(id, "appointment id")
  const body = updateSchema.parse(await request.json())

  const existing = await prisma.appointment.findUnique({
    where: { id },
    select: {
      id: true,
      patientId: true,
      doctorId: true,
      status: true,
      scheduledAt: true,
      duration: true,
    },
  })

  if (!existing) throw new AuthError("Appointment not found", 404)

  const isOwnerPatient =
    actor.role === "PATIENT" && existing.patientId === actor.patientId
  const isAssignedDoctor =
    actor.role === "DOCTOR" && existing.doctorId === actor.doctorId
  const isAdmin = actor.role === "ADMIN"

  if (actor.role === "PATIENT") {
    if (!isOwnerPatient) throw new AuthError("Not your appointment", 403)
    if (body.notes) throw new AuthError("Patients cannot edit clinical notes", 403)
    if (body.status && body.status !== "CANCELLED") {
      throw new AuthError("Patients can only cancel an appointment", 403)
    }
    if (CLOSED.has(existing.status)) {
      throw new AuthError("This appointment can no longer be changed", 409)
    }
  } else if (!isAssignedDoctor && !isAdmin) {
    throw new AuthError("You cannot modify this appointment", 403)
  }

  if (existing.status === "COMPLETED") {
    if (body.status && body.status !== "COMPLETED") {
      throw new AuthError("A completed appointment can no longer be changed", 409)
    }
    if (body.scheduledAt) {
      throw new AuthError("A completed appointment can no longer be rescheduled", 409)
    }
  }

  if (existing.status === "CANCELLED" && body.status && body.status !== "CANCELLED" && actor.role === "PATIENT") {
    throw new AuthError("A cancelled appointment cannot be reopened", 409)
  }

  const nextTime = body.scheduledAt ?? existing.scheduledAt
  const nextStatus = body.status ?? existing.status
  const timeChanged = body.scheduledAt != null && body.scheduledAt.getTime() !== existing.scheduledAt.getTime()
  const reopening = CLOSED.has(existing.status) && !CLOSED.has(nextStatus)

  if ((timeChanged || reopening) && nextTime.getTime() < Date.now() - 60_000) {
    return Response.json({ error: "Appointment time must be in the future" }, { status: 400 })
  }

  const appointment = await prisma.$transaction(async (tx) => {
    if ((timeChanged || reopening) && !CLOSED.has(nextStatus)) {
      await assertDoctorSlotAvailable(tx, existing.doctorId, nextTime, existing.duration, existing.id)
    }

    const updated = await tx.appointment.update({
      where: { id },
      data: {
        status: nextStatus,
        notes: body.notes,
        reason: body.reason,
        scheduledAt: body.scheduledAt,
      },
      include: { doctor: { select: { specialization: true, user: { select: { name: true } } } } },
    })

    if (existing.status !== "COMPLETED" && nextStatus === "COMPLETED") {
      await ensureConsultationInvoice(tx, id)
    }

    return updated
  })

  await recordAudit(
    actor,
    "UPDATE",
    "Appointment",
    id,
    { from: existing.status, to: appointment.status },
    request
  )

  return Response.json({ appointment })
})

export const DELETE = withErrorHandling(async (request: Request, ctx: Context) => {
  const actor = await requireActor()
  const { id } = await ctx.params
  assertObjectId(id, "appointment id")

  const existing = await prisma.appointment.findUnique({
    where: { id },
    select: { id: true, patientId: true, status: true },
  })

  if (!existing) throw new AuthError("Appointment not found", 404)

  const isOwnerPatient =
    actor.role === "PATIENT" && existing.patientId === actor.patientId
  if (!isOwnerPatient && actor.role !== "ADMIN") {
    throw new AuthError("You cannot cancel this appointment", 403)
  }

  if (existing.status === "COMPLETED") {
    throw new AuthError("A completed appointment can no longer be cancelled", 409)
  }

  if (existing.status === "CANCELLED") {
    return Response.json({ appointment: existing })
  }

  const appointment = await prisma.appointment.update({
    where: { id },
    data: { status: "CANCELLED" },
  })

  await recordAudit(actor, "CANCEL", "Appointment", id, null, request)

  return Response.json({ appointment })
})
