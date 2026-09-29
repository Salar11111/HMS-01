import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { nurseCoversPatient } from "@/server/assignment"
import {
  AuthError,
  recordAudit,
  requireActor,
  withErrorHandling,
} from "@/server/authz"

const updateSchema = z.object({
  status: z.enum(["CONFIRMED", "COMPLETED", "NO_SHOW", "CANCELLED"]).optional(),
  notes: z.string().max(2000).optional(),
  reason: z.string().max(500).optional(),
  scheduledAt: z.coerce.date().optional(),
})

type Context = { params: Promise<{ id: string }> }

export const GET = withErrorHandling(async (_request: Request, ctx: Context) => {
  const actor = await requireActor()
  const { id } = await ctx.params

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
  const body = updateSchema.parse(await request.json())

  const existing = await prisma.appointment.findUnique({
    where: { id },
    select: { id: true, patientId: true, doctorId: true, status: true },
  })

  if (!existing) throw new AuthError("Appointment not found", 404)

  const isOwnerPatient =
    actor.role === "PATIENT" && existing.patientId === actor.patientId
  const isAssignedDoctor =
    actor.role === "DOCTOR" && existing.doctorId === actor.doctorId
  const isAdmin = actor.role === "ADMIN"

  // Patients may only reschedule or cancel; clinical status changes are staff-only.
  if (actor.role === "PATIENT") {
    if (!isOwnerPatient) throw new AuthError("Not your appointment", 403)
    if (body.status && !["CANCELLED", "CONFIRMED"].includes(body.status)) {
      throw new AuthError("Patients cannot set clinical appointment status", 403)
    }
    if (body.notes) {
      throw new AuthError("Patients cannot edit clinical notes", 403)
    }
  } else if (!isAssignedDoctor && !isAdmin) {
    throw new AuthError("You cannot modify this appointment", 403)
  }

  if (existing.status === "COMPLETED" && body.status !== "COMPLETED") {
    throw new AuthError("A completed appointment can no longer be changed", 409)
  }

  const appointment = await prisma.appointment.update({
    where: { id },
    data: {
      status: body.status ?? existing.status,
      notes: body.notes,
      reason: body.reason,
      scheduledAt: body.scheduledAt,
    },
    include: { doctor: { select: { specialization: true, user: { select: { name: true } } } } },
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

  // Soft cancel rather than delete so clinical history and audit trail survive.
  const appointment = await prisma.appointment.update({
    where: { id },
    data: { status: "CANCELLED" },
  })

  await recordAudit(actor, "CANCEL", "Appointment", id, null, request)

  return Response.json({ appointment })
})
