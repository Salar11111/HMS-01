import { prisma } from "@/lib/prisma"
import { assertObjectId, AuthError, ConflictError, recordAudit, requireRole, withErrorHandling } from "@/server/authz"

type Context = { params: Promise<{ id: string }> }

export const POST = withErrorHandling(async (request: Request, ctx: Context) => {
  const actor = await requireRole("ADMIN")
  const { id } = await ctx.params
  assertObjectId(id, "prescription id")

  const dispensed = await prisma.$transaction(async (tx) => {
    const prescription = await tx.prescription.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        items: { select: { quantity: true, drug: { select: { id: true, name: true } } } },
      },
    })
    if (!prescription) throw new AuthError("Prescription not found", 404)
    if (prescription.status !== "ACTIVE") {
      throw new ConflictError("Only an active prescription can be dispensed")
    }

    for (const item of prescription.items) {
      const batches = await tx.stockBatch.findMany({
        where: { drugId: item.drug.id, quantity: { gt: 0 }, expiryDate: { gt: new Date() } },
        orderBy: { expiryDate: "asc" },
      })
      let remaining = item.quantity
      for (const batch of batches) {
        if (remaining <= 0) break
        const take = Math.min(batch.quantity, remaining)
        await tx.stockBatch.update({
          where: { id: batch.id },
          data: { quantity: { decrement: take } },
        })
        remaining -= take
      }
      if (remaining > 0) {
        throw new ConflictError(`${item.drug.name} does not have enough unexpired stock`)
      }

      const shelf = await tx.inventory.findFirst({
        where: { name: { startsWith: item.drug.name }, department: { name: "Pharmacy" } },
        select: { id: true, quantity: true },
      })
      if (shelf) {
        if (shelf.quantity < item.quantity) {
          throw new ConflictError(`${item.drug.name} is short on the pharmacy shelf`)
        }
        await tx.inventory.update({
          where: { id: shelf.id },
          data: { quantity: { decrement: item.quantity } },
        })
      }
    }

    return tx.prescription.update({
      where: { id },
      data: { status: "DISPENSED" },
    })
  })

  await recordAudit(actor, "DISPENSE", "Prescription", id, null, request)
  return Response.json({ prescription: dispensed })
})
