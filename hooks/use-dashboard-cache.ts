"use client"

// ✅ NEW: Custom hook for dashboard caching
import { useState, useCallback, useRef } from "react"

interface CacheEntry<T> {
  data: T
  timestamp: number
  key: string
}

interface UseDashboardCacheOptions {
  ttl?: number // Time to live in milliseconds
  maxSize?: number // Maximum number of cache entries
}

export function useDashboardCache<T>(options: UseDashboardCacheOptions = {}) {
  const { ttl = 60000, maxSize = 50 } = options
  const cacheRef = useRef(new Map<string, CacheEntry<T>>())
  const [cacheStats, setCacheStats] = useState({ hits: 0, misses: 0 })

  const get = useCallback(
    (key: string): T | null => {
      const cache = cacheRef.current
      const entry = cache.get(key)

      if (!entry) {
        setCacheStats((prev) => ({ ...prev, misses: prev.misses + 1 }))
        return null
      }

      if (Date.now() - entry.timestamp > ttl) {
        cache.delete(key)
        setCacheStats((prev) => ({ ...prev, misses: prev.misses + 1 }))
        return null
      }

      setCacheStats((prev) => ({ ...prev, hits: prev.hits + 1 }))
      return entry.data
    },
    [ttl],
  )

  const set = useCallback(
    (key: string, data: T): void => {
      const cache = cacheRef.current

      // Remove oldest entries if cache is full
      if (cache.size >= maxSize) {
        const oldestKey = cache.keys().next().value
        if (oldestKey) {
          cache.delete(oldestKey)
        }
      }

      cache.set(key, {
        data,
        timestamp: Date.now(),
        key,
      })
    },
    [maxSize],
  )

  const clear = useCallback((): void => {
    cacheRef.current.clear()
    setCacheStats({ hits: 0, misses: 0 })
  }, [])

  const remove = useCallback((key: string): boolean => {
    return cacheRef.current.delete(key)
  }, [])

  const getStats = useCallback(() => {
    const total = cacheStats.hits + cacheStats.misses
    return {
      ...cacheStats,
      hitRate: total > 0 ? (cacheStats.hits / total) * 100 : 0,
      size: cacheRef.current.size,
    }
  }, [cacheStats])

  return {
    get,
    set,
    clear,
    remove,
    getStats,
  }
}
