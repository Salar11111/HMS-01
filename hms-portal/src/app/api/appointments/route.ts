import { z } from "zod"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { nurseWardPatientIds } from "@/server/assignment"
import { AuthError, ConflictError, recordAudit, requireActor, withErrorHandling } from "@/server/authz"
import type { Actor } from "@/server/authz"

const createSchema = z.object({
  doctorId: z.string().min(1),
  scheduledAt: z.coerce.date(),
  reason: z.string().max(500).optional(),
  duration: z.number().int().min(10).max(240).default(30),
})

const listSchema = z.object({
  scope: z.enum(["upcoming", "past"]).default("upcoming"),
  take: z.coerce.number().int().min(1).max(100).default(50),
})

async function listScope(actor: Actor): Promise<Prisma.AppointmentWhereInput> {
  if (actor.role === "PATIENT") {
    if (!actor.patientId) {
      throw new AuthError("Your account is not linked to a patient record", 403)
    }
    return { patientId: actor.patientId }
  }

  if (actor.role === "DOCTOR") {
    if (!actor.doctorId) {
      throw new AuthError("Your account is not linked to a doctor profile", 403)
    }
    return { doctorId: actor.doctorId }
  }

  if (actor.role === "NURSE") {
    if (!actor.nurseId) {
      throw new AuthError("Your account is not linked to a nurse profile", 403)
    }
    const patientIds = await nurseWardPatientIds(actor.nurseId)
    return { patientId: { in: patientIds } }
  }

  if (actor.role === "ADMIN") return {}

  throw new AuthError("Insufficient permissions for this action", 403)
}

function rangesOverlap(
  startA: number,
  durationA: number,
  startB: number,
  durationB: number,
) {
  const endA = startA + durationA * 60_000
  const endB = startB + durationB * 60_000
  return startA < endB && startB < endA
}

export const GET = withErrorHandling(async (request: Request) => {
  const actor = await requireActor()
  const url = new URL(request.url)
  const { scope, take } = listSchema.parse(
    Object.fromEntries(url.searchParams.entries())
  )

  const now = new Date()
  const where: Prisma.AppointmentWhereInput = {
    ...(await listScope(actor)),
    scheduledAt: scope === "upcoming" ? { gte: now } : { lt: now },
  }

  const appointments = await prisma.appointment.findMany({
    where,
    take,
    orderBy: { scheduledAt: scope === "upcoming" ? "asc" : "desc" },
    include: {
      patient: { select: { id: true, medicalRecordNumber: true, user: { select: { name: true } } } },
      doctor: { select: { id: true, specialization: true, user: { select: { name: true, image: true } } } },
    },
  })

  return Response.json({ appointments })
})

export const POST = withErrorHandling(async (request: Request) => {
  const actor = await requireActor()

  if (!actor.patientId) {
    return Response.json(
      { error: "Only patient accounts can book appointments" },
      { status: 403 }
    )
  }

  const body = createSchema.parse(await request.json())

  if (body.scheduledAt.getTime() < Date.now() - 60_000) {
    return Response.json(
      { error: "Appointment time must be in the future" },
      { status: 400 }
    )
  }

  const book = () =>
    prisma.$transaction(async (tx) => {
      try {
        await tx.doctor.update({
          where: { id: body.doctorId },
          data: { updatedAt: new Date() },
        })
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
          throw new AuthError("That physician was not found", 404)
        }
        throw error
      }

      const existing = await tx.appointment.findMany({
        where: {
          doctorId: body.doctorId,
          status: { in: ["SCHEDULED", "CONFIRMED", "IN_PROGRESS"] },
        },
        select: { scheduledAt: true, duration: true },
      })

      const overlaps = existing.some(row =>
        rangesOverlap(
          body.scheduledAt.getTime(),
          body.duration,
          row.scheduledAt.getTime(),
          row.duration,
        )
      )
      if (overlaps) {
        throw new ConflictError("That time slot is no longer available")
      }

      return tx.appointment.create({
        data: {
          patientId: actor.patientId!,
          doctorId: body.doctorId,
          scheduledAt: body.scheduledAt,
          duration: body.duration,
          reason: body.reason,
          status: "CONFIRMED",
        },
        include: { doctor: { select: { specialization: true, user: { select: { name: true } } } } },
      })
    })

  let appointment
  try {
    appointment = await book()
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      appointment = await book()
    } else {
      throw error
    }
  }

  await recordAudit(actor, "CREATE", "Appointment", appointment.id, {
    doctorId: body.doctorId,
    scheduledAt: appointment.scheduledAt.toISOString(),
  }, request)

  return Response.json({ appointment }, { status: 201 })
})
