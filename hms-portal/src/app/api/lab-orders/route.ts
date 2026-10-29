import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { assertPatientVisible, patientScope, scopedPatientFilter } from "@/server/assignment"
import {
  assertObjectId,
  recordAudit,
  requireRole,
  withErrorHandling,
} from "@/server/authz"

const listSchema = z.object({
  status: z
    .enum(["ORDERED", "COLLECTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
    .optional(),
  take: z.coerce.number().int().min(1).max(200).default(100),
})

const orderSchema = z.object({
  patientId: z.string().min(1),
  appointmentId: z.string().optional(),
  priority: z.enum(["ROUTINE", "URGENT", "STAT"]).default("ROUTINE"),
  tests: z.array(z.string().min(1)).min(1).max(30),
  notes: z.string().max(2000).optional(),
})

const resultsSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        result: z.string().min(1).max(200),
        flag: z.enum(["NORMAL", "LOW", "HIGH", "CRITICAL"]).default("NORMAL"),
      })
    )
    .min(1)
    .max(50),
})

export const GET = withErrorHandling(async (request: Request) => {
  const actor = await requireRole("DOCTOR", "NURSE", "ADMIN")
  const url = new URL(request.url)
  const { status, take } = listSchema.parse(
    Object.fromEntries(url.searchParams.entries())
  )
  const patientId = scopedPatientFilter(
    await patientScope(actor),
    url.searchParams.get("patientId")
  )

  const orders = await prisma.labOrder.findMany({
    take,
    orderBy: [{ priority: "desc" }, { orderedAt: "asc" }],
    where: {
      ...(status ? { status } : {}),
      ...(patientId ? { patientId } : {}),
    },
    include: {
      items: true,
      patient: {
        select: {
          id: true,
          medicalRecordNumber: true,
          user: { select: { name: true } },
        },
      },
      doctor: { select: { user: { select: { name: true } } } },
    },
  })

  return Response.json({ orders })
})

export const POST = withErrorHandling(async (request: Request) => {
  const actor = await requireRole("DOCTOR")
  const body = orderSchema.parse(await request.json())

  if (!actor.doctorId) {
    return Response.json(
      { error: "Your account is not linked to a doctor profile" },
      { status: 403 }
    )
  }

  assertObjectId(body.patientId, "patient id")
  assertPatientVisible(await patientScope(actor), body.patientId)

  if (body.appointmentId) {
    assertObjectId(body.appointmentId, "appointment id")
    const appointment = await prisma.appointment.findUnique({
      where: { id: body.appointmentId },
      select: { patientId: true, doctorId: true },
    })
    if (!appointment || appointment.patientId !== body.patientId || appointment.doctorId !== actor.doctorId) {
      return Response.json({ error: "That appointment is not on your panel" }, { status: 403 })
    }
  }

  const order = await prisma.labOrder.create({
    data: {
      patientId: body.patientId,
      doctorId: actor.doctorId,
      appointmentId: body.appointmentId,
      priority: body.priority,
      notes: body.notes,
      status: "ORDERED",
      items: { create: body.tests.map(testName => ({ testName })) },
    },
    include: { items: true },
  })

  await recordAudit(actor, "CREATE", "LabOrder", order.id, {
    tests: body.tests,
    priority: body.priority,
  }, request)

  return Response.json({ order }, { status: 201 })
})

export const PUT = withErrorHandling(async (request: Request) => {
  const actor = await requireRole("NURSE", "ADMIN")
  const body = resultsSchema.parse(await request.json())

  const ids = body.items.map(i => i.id)
  for (const id of ids) assertObjectId(id, "lab item id")

  const existing = await prisma.labOrderItem.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      orderId: true,
      order: { select: { status: true, patientId: true, doctorId: true } },
    },
  })

  if (existing.length !== ids.length) {
    return Response.json(
      { error: "One or more result rows no longer exist" },
      { status: 404 }
    )
  }

  if (existing.some(e => e.order.status === "CANCELLED")) {
    return Response.json(
      { error: "Results cannot be entered for a cancelled order" },
      { status: 409 }
    )
  }

  const scope = await patientScope(actor)
  for (const row of existing) {
    assertPatientVisible(scope, row.order.patientId)
  }

  const result = await prisma.$transaction(async (tx) => {
    for (const item of body.items) {
      await tx.labOrderItem.update({
        where: { id: item.id },
        data: { result: item.result, flag: item.flag, performedAt: new Date() },
      })
    }

    const orderIds = [...new Set(existing.map(e => e.orderId))]

    for (const orderId of orderIds) {
      const remaining = await tx.labOrderItem.count({
        where: { orderId, result: null },
      })
      await tx.labOrder.update({
        where: { id: orderId },
        data: { status: remaining === 0 ? "COMPLETED" : "IN_PROGRESS" },
      })
    }

    return orderIds
  })

  const critical = body.items.filter(i => i.flag === "CRITICAL")
  const orderIdByItem = new Map(existing.map(row => [row.id, row.orderId]))

  if (critical.length) {
    const orders = await prisma.labOrder.findMany({
      where: { id: { in: result } },
      select: {
        id: true,
        doctor: { select: { userId: true } },
        patient: { select: { user: { select: { name: true } } } },
      },
    })

    for (const order of orders) {
      const values = critical
        .filter(item => orderIdByItem.get(item.id) === order.id)
        .map(item => item.result)
      if (!values.length) continue
      await prisma.notification.create({
        data: {
          userId: order.doctor.userId,
          title: `Critical lab result: ${order.patient.user.name}`,
          body: values.join(", "),
          link: "/portal/doctor/ehr",
        },
      })
    }
  }

  await recordAudit(actor, "UPDATE", "LabOrderItem", result.join(","), {
    criticalCount: critical.length,
  }, request)

  return Response.json({ updatedOrders: result, critical: critical.length })
})
