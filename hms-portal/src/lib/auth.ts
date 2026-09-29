import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import { compare } from "bcryptjs"
import { z } from "zod"

export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        role: { label: "Role", type: "text" },
      },
      authorize: async (credentials) => {
        const schema = z.object({
          email: z.string().email(),
          password: z.string().min(6),
          role: z.enum(["PATIENT", "DOCTOR", "NURSE", "ADMIN"]).optional(),
        })
        
        const parsed = schema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password, role } = parsed.data
        const user = await prisma.user.findUnique({ where: { email } })
        
        if (!user || !user.passwordHash) return null
        
        const valid = await compare(password, user.passwordHash)
        if (!valid) return null
        
        if (role && user.role !== role) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.image,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id ?? token.sub ?? ""
        token.role = user.role
      }
      if (trigger === "update" && session && typeof session === "object" && "name" in session) {
        const name = (session as { name?: unknown }).name
        if (typeof name === "string") token.name = name
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id
        session.user.role = token.role
      }
      return session
    },
  },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  secret: process.env.AUTH_SECRET,
  // Required outside Vercel (local dev) so Auth.js will accept the Host
  // header when building callback URLs. Vercel sets VERCEL=1 and this is a
  // no-op there.
  trustHost: true,
})

declare module "next-auth" {
  interface User {
    role: "PATIENT" | "DOCTOR" | "NURSE" | "ADMIN"
  }
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      role: "PATIENT" | "DOCTOR" | "NURSE" | "ADMIN"
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: "PATIENT" | "DOCTOR" | "NURSE" | "ADMIN"
  }
}