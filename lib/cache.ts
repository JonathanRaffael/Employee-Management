const cache = new Map<string, { data: any; expires: number }>()

export function getCached<T>(key: string): T | null {
  const cached = cache.get(key)
  if (cached && cached.expires > Date.now()) {
    return cached.data
  }
  cache.delete(key)
  return null
}

export function setCache<T>(key: string, data: T, ttlMinutes = 10): void {
  cache.set(key, {
    data,
    expires: Date.now() + ttlMinutes * 60 * 1000,
  })
}

export function clearCache(pattern?: string): void {
  if (pattern) {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key)
      }
    }
  } else {
    cache.clear()
  }
}
