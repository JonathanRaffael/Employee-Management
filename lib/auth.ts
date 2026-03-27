import type { NextAuthOptions, DefaultSession } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prismaBase } from "@/lib/prisma"
import { compare } from "bcryptjs"

/* =========================
   TYPE AUGMENTATION
========================= */
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      department?: string | null
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    role: string
    department?: string | null
    remember?: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: string
    department?: string | null
    remember?: boolean
  }
}

/* =========================
   AUTH OPTIONS
========================= */
export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        remember: { label: "Remember", type: "text" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prismaBase.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            role: true,
            department: true, // ✅ SESUAI SCHEMA
          },
        })

        if (!user?.password) return null

        const valid = await compare(credentials.password, user.password)
        if (!valid) return null

        const remember =
          String(credentials.remember || "").toLowerCase() === "true"

        return {
          id: user.id,
          email: user.email!,
          name: user.name ?? undefined,
          role: user.role ?? "user",
          department: user.department ?? null, // ✅
          remember,
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.department = user.department ?? null
        token.remember = user.remember ?? false

        const now = Math.floor(Date.now() / 1000)
        const eightHours = 8 * 60 * 60
        const thirtyDays = 30 * 24 * 60 * 60
        token.exp = now + (token.remember ? thirtyDays : eightHours)
      }
      return token
    },

    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.department = token.department as string | null
      }
      return session
    },
  },
}
