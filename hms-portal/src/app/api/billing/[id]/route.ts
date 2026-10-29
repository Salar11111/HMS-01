import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { centsToDollars, dollarsToCents } from "@/lib/money"
import { assertObjectId, AuthError, ConflictError, recordAudit, requireRole, withErrorHandling } from "@/server/authz"

const paymentSchema = z.object({
  amount: z.coerce.number().positive().max(1_000_000),
  method: z.enum(["CASH", "CARD", "BANK_TRANSFER", "INSURANCE"]),
  reference: z.string().max(120).optional(),
})

const voidSchema = z.object({
  status: z.literal("VOID"),
})

type Context = { params: Promise<{ id: string }> }

export const PATCH = withErrorHandling(async (request: Request, ctx: Context) => {
  const actor = await requireRole("ADMIN")
  const { id } = await ctx.params
  assertObjectId(id, "invoice id")
  voidSchema.parse(await request.json())

  const existing = await prisma.invoice.findUnique({
    where: { id },
    select: { id: true, status: true, paidAmount: true },
  })
  if (!existing) throw new AuthError("Invoice not found", 404)
  if (existing.status === "VOID") return Response.json({ invoice: existing })
  if (existing.status === "PAID" || existing.paidAmount > 0) {
    throw new ConflictError("An invoice with payments cannot be voided")
  }

  const invoice = await prisma.invoice.update({
    where: { id },
    data: { status: "VOID" },
  })
  await recordAudit(actor, "VOID", "Invoice", id, null, request)
  return Response.json({
    invoice: {
      ...invoice,
      totalAmount: centsToDollars(invoice.totalAmount),
      paidAmount: centsToDollars(invoice.paidAmount),
      balance: centsToDollars(invoice.totalAmount - invoice.paidAmount),
    },
  })
})

export const POST = withErrorHandling(async (request: Request, ctx: Context) => {
  const actor = await requireRole("PATIENT", "ADMIN")
  if (actor.role === "PATIENT" && !actor.patientId) {
    throw new AuthError("Your account is not linked to a patient record", 403)
  }
  const { id } = await ctx.params
  assertObjectId(id, "invoice id")
  const body = paymentSchema.parse(await request.json())

  const result = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where: { id },
      select: {
        id: true,
        patientId: true,
        totalAmount: true,
        paidAmount: true,
        status: true,
      },
    })

    if (!invoice) {
      throw new AuthError("Invoice not found", 404)
    }

    if (actor.role === "PATIENT" && invoice.patientId !== actor.patientId) {
      throw new AuthError("Not your invoice", 403)
    }

    if (invoice.status === "VOID" || invoice.status === "PAID") {
      throw new AuthError("This invoice cannot accept payment", 409)
    }

    const amountCents = dollarsToCents(body.amount)
    const balanceCents = invoice.totalAmount - invoice.paidAmount

    if (amountCents > balanceCents) {
      throw new AuthError(
        `Payment exceeds the outstanding balance of $${centsToDollars(balanceCents).toFixed(2)}`,
        400
      )
    }

    const nextStatus = amountCents >= balanceCents ? "PAID" : "PARTIALLY_PAID"
    const claimed = await tx.invoice.updateMany({
      where: {
        id,
        paidAmount: invoice.paidAmount,
        status: invoice.status,
      },
      data: {
        paidAmount: { increment: amountCents },
        status: nextStatus,
      },
    })

    if (claimed.count !== 1) {
      throw new AuthError("This invoice was updated by another payment", 409)
    }

    const payment = await tx.payment.create({
      data: {
        invoiceId: id,
        amount: amountCents,
        method: body.method,
        reference: body.reference,
      },
    })

    const updated = await tx.invoice.findUniqueOrThrow({
      where: { id },
      select: { id: true, status: true, totalAmount: true, paidAmount: true },
    })

    return { payment, updated }
  })

  await recordAudit(
    actor,
    "PAY",
    "Invoice",
    id,
    { amount: body.amount, method: body.method },
    request
  )

  return Response.json(
    {
      payment: { ...result.payment, amount: centsToDollars(result.payment.amount) },
      invoice: {
        id: result.updated.id,
        status: result.updated.status,
        totalAmount: centsToDollars(result.updated.totalAmount),
        paidAmount: centsToDollars(result.updated.paidAmount),
        balance: centsToDollars(result.updated.totalAmount - result.updated.paidAmount),
      },
    },
    { status: 201 }
  )
})
