import { PrismaClient } from "@prisma/client";

// ====== Config via ENV ======
const IS_DEV = process.env.NODE_ENV === "development";
const ENABLE_QUERY_LOG = process.env.QUERY_LOG === "1";          // nyalakan kalau perlu
const SLOW_MS = Number(process.env.SLOW_QUERY_MS ?? "150");      // default 150ms

// ====== Global cache (hindari multi-instance di dev/HMR) ======
const g = globalThis as unknown as {
  __PRISMA_BASE__?: PrismaClient;
  __PRISMA__?: PrismaClient; // NOTE: simpan extended client sebagai PrismaClient (cast)
};

// ====== Lazy init base client ======
function getBaseClient(): PrismaClient {
  if (g.__PRISMA_BASE__) return g.__PRISMA_BASE__;

  const base = new PrismaClient({
    log: IS_DEV
      ? (ENABLE_QUERY_LOG ? (["query", "warn", "error"] as const) : (["warn", "error"] as const))
      : (["error"] as const),
    datasources: { db: { url: process.env.DATABASE_URL } },
  });

  if (IS_DEV) g.__PRISMA_BASE__ = base;
  return base;
}

// ====== Extend untuk slow-query logging (tipe diperhalus) ======
function getExtendedClient(base: PrismaClient): PrismaClient {
  if (g.__PRISMA__) return g.__PRISMA__;

  // hasil $extends bertipe DynamicClientExtensionThis -> cast ke PrismaClient agar cocok dengan global
  const extended = base.$extends({
    query: {
      $allModels: {
        async $allOperations({ operation, model, args, query }) {
          const t0 = Date.now();
          const result = await query(args);
          const delta = Date.now() - t0;
          if (delta > SLOW_MS) {
            console.warn(`Slow query: ${model}.${operation} took ${delta}ms`);
          }
          return result;
        },
      },
    },
  }) as unknown as PrismaClient;

  if (IS_DEV) g.__PRISMA__ = extended;
  return extended;
}

// ====== Exports ======
export const prismaBase = getBaseClient();
export const prisma = getExtendedClient(prismaBase);
