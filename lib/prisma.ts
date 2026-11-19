
import { PrismaClient } from "@prisma/client"

const IS_DEV = process.env.NODE_ENV === "development"
const ENABLE_QUERY_LOG = process.env.QUERY_LOG === "1"
const SLOW_MS = Number(process.env.SLOW_QUERY_MS ?? "150")

const globalForPrisma = globalThis as typeof globalThis & {
  prismaBase?: PrismaClient
  prisma?: PrismaClient
}

function createBaseClient() {
  return new PrismaClient({
    log: ENABLE_QUERY_LOG
      ? ["query", "warn", "error"]
      : IS_DEV
        ? ["warn", "error"]
        : ["error"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })
}

// Reuse the same base Prisma client.
const base =
  globalForPrisma.prismaBase ?? createBaseClient()

// Reuse the extended Prisma client.
const extended =
  globalForPrisma.prisma ??
  (base.$extends({
    query: {
      $allModels: {
        async $allOperations({ operation, model, args, query }) {
          const start = performance.now()
          const result = await query(args)
          const duration = performance.now() - start

          if (duration > SLOW_MS) {
            console.warn(
              `Slow query: ${model}.${operation} took ${duration.toFixed(2)}ms`
            )
          }

          return result
        },
      },
    },
  }) as unknown as PrismaClient)

// Cache in ALL environments, including production.
globalForPrisma.prismaBase = base
globalForPrisma.prisma = extended

export const prismaBase = base
export const prisma = extended
