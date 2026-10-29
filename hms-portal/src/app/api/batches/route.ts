import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { assertObjectId, AuthError, recordAudit, requireRole, withErrorHandling } from "@/server/authz"

const receiveSchema = z.object({
  drugId: z.string().min(1),
  batchNumber: z.string().trim().min(1).max(64),
  expiryDate: z.coerce.date(),
  quantity: z.number().int().positive().max(100_000),
  unitCost: z.number().nonnegative().max(1_000_000).optional(),
})

export const POST = withErrorHandling(async (request: Request) => {
  const actor = await requireRole("ADMIN")
  const body = receiveSchema.parse(await request.json())
  assertObjectId(body.drugId, "drug id")

  if (body.expiryDate.getTime() <= Date.now()) {
    throw new AuthError("Receive an unexpired batch", 400)
  }

  const drug = await prisma.drug.findUnique({
    where: { id: body.drugId },
    select: { id: true, name: true, unitCost: true },
  })
  if (!drug) throw new AuthError("Drug not found", 404)

  const unitCost = body.unitCost ?? drug.unitCost

  const result = await prisma.$transaction(async tx => {
    const existing = await tx.stockBatch.findUnique({
      where: { drugId_batchNumber: { drugId: drug.id, batchNumber: body.batchNumber } },
      select: { id: true, quantity: true },
    })

    const batch = existing
      ? await tx.stockBatch.update({
          where: { id: existing.id },
          data: {
            quantity: { increment: body.quantity },
            expiryDate: body.expiryDate,
            unitCost,
          },
        })
      : await tx.stockBatch.create({
          data: {
            drugId: drug.id,
            batchNumber: body.batchNumber,
            expiryDate: body.expiryDate,
            quantity: body.quantity,
            unitCost,
          },
        })

    const shelf = await tx.inventory.findFirst({
      where: { name: { startsWith: drug.name }, department: { name: "Pharmacy" } },
      select: { id: true },
    })
    if (shelf) {
      await tx.inventory.update({
        where: { id: shelf.id },
        data: { quantity: { increment: body.quantity } },
      })
    }

    return batch
  })

  await recordAudit(
    actor,
    "RECEIVE",
    "StockBatch",
    result.id,
    { drugId: drug.id, batchNumber: body.batchNumber, quantity: body.quantity },
    request,
  )
  return Response.json({ batch: result }, { status: 201 })
})
