import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { AuthError, recordAudit, requireRole, withErrorHandling } from "@/server/authz"

const paymentSchema = z.object({
  amount: z.coerce.number().positive().max(1_000_000),
  method: z.enum(["CASH", "CARD", "BANK_TRANSFER", "INSURANCE"]),
  reference: z.string().max(120).optional(),
})

type Context = { params: Promise<{ id: string }> }

export const POST = withErrorHandling(async (request: Request, ctx: Context) => {
  const actor = await requireRole("PATIENT", "ADMIN")
  const { id } = await ctx.params
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

    const totalCents = Math.round(Number(invoice.totalAmount) * 100)
    const paidCents = Math.round(Number(invoice.paidAmount) * 100)
    const amountCents = Math.round(body.amount * 100)
    const balanceCents = totalCents - paidCents

    if (amountCents > balanceCents) {
      throw new AuthError(
        `Payment exceeds the outstanding balance of $${(balanceCents / 100).toFixed(2)}`,
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
        paidAmount: { increment: amountCents / 100 },
        status: nextStatus,
      },
    })

    if (claimed.count !== 1) {
      throw new AuthError("This invoice was updated by another payment", 409)
    }

    const payment = await tx.payment.create({
      data: {
        invoiceId: id,
        amount: amountCents / 100,
        method: body.method,
        reference: body.reference,
      },
    })

    const updated = await tx.invoice.findUniqueOrThrow({
      where: { id },
      select: { id: true, status: true, totalAmount: true, paidAmount: true },
    })

    return { payment, updated, balanceCents }
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
      payment: result.payment,
      invoice: {
        ...result.updated,
        balance: (result.balanceCents - Math.round(body.amount * 100)) / 100,
      },
    },
    { status: 201 }
  )
})
