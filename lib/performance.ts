// Performance monitoring utilities

// Cache utility with TTL
export class TTLCache<K, V> {
  private cache = new Map<K, { value: V; timestamp: number }>()
  private ttl: number

  constructor(ttlMs: number) {
    this.ttl = ttlMs

    // Auto cleanup every minute
    setInterval(() => this.cleanup(), 60000)
  }

  set(key: K, value: V): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    })
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key)

    if (!entry) {
      return undefined
    }

    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key)
      return undefined
    }

    return entry.value
  }

  clear(): void {
    this.cache.clear()
  }

  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key)
      }
    }
  }
}

// Performance measurement utility
export function measurePerformance<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const startTime = Date.now()

    try {
      const result = await operation()
      const endTime = Date.now()
      const duration = endTime - startTime

      console.log(`⚡ ${operationName} completed in ${duration}ms`)

      // Log slow operations
      if (duration > 1000) {
        console.warn(`🐌 Slow operation detected: ${operationName} took ${duration}ms`)
      }

      resolve(result)
    } catch (error) {
      const endTime = Date.now()
      const duration = endTime - startTime

      console.error(`❌ ${operationName} failed after ${duration}ms:`, error)
      reject(error)
    }
  })
}

// Debounce utility
export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }

    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

// Throttle utility
export function throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => void {
  let inThrottle = false

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}
