import { PrismaClient } from "@prisma/client"

// ====== Config via ENV ======
const IS_DEV = process.env.NODE_ENV === "development"
const ENABLE_QUERY_LOG = process.env.QUERY_LOG === "1"
const SLOW_MS = Number(process.env.SLOW_QUERY_MS ?? "150")

const g = globalThis as unknown as {
  __PRISMA_BASE__?: PrismaClient
  __PRISMA__?: PrismaClient
}

function getBaseClient(): PrismaClient {
  if (g.__PRISMA_BASE__) return g.__PRISMA_BASE__

  const base = new PrismaClient({
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

  if (IS_DEV) {
    g.__PRISMA_BASE__ = base
  }

  return base
}

function getExtendedClient(base: PrismaClient): PrismaClient {
  if (g.__PRISMA__) return g.__PRISMA__

  const extended = base.$extends({
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
  }) as unknown as PrismaClient

  if (IS_DEV) {
    g.__PRISMA__ = extended
  }

  return extended
}

export const prismaBase = getBaseClient()
export const prisma = getExtendedClient(prismaBase)