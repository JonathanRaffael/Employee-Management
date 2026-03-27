// lib/form-cache.ts

/* =====================================================
   GLOBAL CACHE VERSIONING
   → setiap perubahan data akan bump version
   → semua cache lama otomatis invalid
===================================================== */

export let CACHE_VERSION = 0

export function invalidateFormCache() {
  CACHE_VERSION++

  formCache.clear()
  countCache.clear()

  console.log("🔥 Cache invalidated | version:", CACHE_VERSION)
}

/* =====================================================
   CACHE ENTRY TYPE
===================================================== */

type CacheEntry<T = any> = {
  data: T
  timestamp: number
  size: number
  hits: number
}

/* =====================================================
   HIGH PERFORMANCE CACHE
===================================================== */

class HighPerformanceCache {
  private cache = new Map<string, CacheEntry>()
  private totalSize = 0

  constructor(
    private maxSize = 100,
    private maxTotalSize = 50 * 1024 * 1024, // 50MB
    private ttl = 60_000 // 60 detik
  ) {}

  /* =====================
     GET CACHE
  ===================== */
  get<T = any>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    // expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.totalSize -= entry.size
      this.cache.delete(key)
      return null
    }

    entry.hits++
    return entry.data as T
  }

  /* =====================
     SET CACHE
  ===================== */
  set(key: string, data: any) {
    const size = this.estimateSize(data)

    this.cleanup()

    // remove oldest if limit reached
    while (
      (this.cache.size >= this.maxSize ||
        this.totalSize + size > this.maxTotalSize) &&
      this.cache.size > 0
    ) {
      const oldestKey = this.cache.keys().next().value
      if (!oldestKey) break

      const old = this.cache.get(oldestKey)
      if (old) this.totalSize -= old.size

      this.cache.delete(oldestKey)
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      size,
      hits: 0,
    })

    this.totalSize += size
  }

  /* =====================
     CLEAR CACHE
  ===================== */
  clear() {
    this.cache.clear()
    this.totalSize = 0
  }

  /* =====================
     CLEANUP EXPIRED
  ===================== */
  private cleanup() {
    const now = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.totalSize -= entry.size
        this.cache.delete(key)
      }
    }
  }

  /* =====================
     SIZE ESTIMATION
  ===================== */
  private estimateSize(obj: any): number {
    try {
      return JSON.stringify(obj).length * 2
    } catch {
      return 0
    }
  }
}

/* =====================================================
   SHARED CACHE INSTANCES
===================================================== */

export const formCache = new HighPerformanceCache()

export const countCache = new HighPerformanceCache(
  50,
  10 * 1024 * 1024,
  30_000
)