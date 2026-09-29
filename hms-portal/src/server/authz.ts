import "server-only"
import { Prisma } from "@prisma/client"
import { ZodError } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Role } from "@prisma/client"

export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = "AuthError"
  }
}

export type Actor = {
  userId: string
  role: Role
  patientId?: string
  doctorId?: string
  nurseId?: string
}

/**
 * Resolves the current session and maps it to the clinical profile rows
 * (Patient / Doctor / Nurse) that own the user's data.
 */
export async function requireActor(): Promise<Actor> {
  const session = await auth()

  if (!session?.user?.id) {
    throw new AuthError("Authentication required", 401)
  }

  // Sessions issued before the MongoDB move store cuid ids. Those are not
  // ObjectIds, and Prisma rejects them before it can report a missing user.
  if (!/^[a-f\d]{24}$/i.test(session.user.id)) {
    throw new AuthError("Account no longer exists", 401)
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      patient: { select: { id: true } },
      doctor: { select: { id: true } },
      nurse: { select: { id: true } },
    },
  })

  if (!user) {
    throw new AuthError("Account no longer exists", 401)
  }

  return {
    userId: user.id,
    role: user.role,
    patientId: user.patient?.id,
    doctorId: user.doctor?.id,
    nurseId: user.nurse?.id,
  }
}

export async function requireRole(...allowed: Role[]): Promise<Actor> {
  const actor = await requireActor()

  if (!allowed.includes(actor.role)) {
    throw new AuthError("Insufficient permissions for this action", 403)
  }

  return actor
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ConflictError"
  }
}

export function toErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return Response.json({ error: error.message }, { status: error.status })
  }

  if (error instanceof ConflictError) {
    return Response.json({ error: error.message }, { status: 409 })
  }

  if (error instanceof ZodError) {
    return Response.json(
      {
        error: "Invalid request body",
        issues: error.issues.map(i => ({ path: i.path.join("."), message: i.message })),
      },
      { status: 400 }
    )
  }

  // Thrown by `request.json()` when the client sends a malformed body.
  if (error instanceof SyntaxError) {
    return Response.json({ error: "Request body is not valid JSON" }, { status: 400 })
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return Response.json({ error: "That record already exists" }, { status: 409 })
    }
    if (error.code === "P2025") {
      return Response.json({ error: "Record not found" }, { status: 404 })
    }
  }

  console.error("[api] unhandled error", error)
  return Response.json({ error: "Unexpected server error" }, { status: 500 })
}

/** Wraps a route handler so thrown AuthErrors become proper HTTP responses. */
export function withErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<Response>,
) {
  return async (...args: T) => {
    try {
      return await handler(...args)
    } catch (error) {
      return toErrorResponse(error)
    }
  }
}

export async function recordAudit(
  actor: Actor,
  action: string,
  entity: string,
  entityId?: string,
  data?: Record<string, unknown> | null,
  request?: Request,
) {
  await prisma.auditLog.create({
    data: {
      userId: actor.userId,
      action,
      entity,
      entityId,
      newData: data ? JSON.stringify(data) : null,
      ipAddress: request?.headers.get("x-forwarded-for") ?? undefined,
      userAgent: request?.headers.get("user-agent") ?? undefined,
    },
  })
}
