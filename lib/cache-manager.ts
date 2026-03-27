export interface CacheEntry<T> {
  data: T
  timestamp: number
  size: number
  hits: number
  lastAccessed: number
  tags?: string[]
}

export class AdvancedCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>()
  private totalSize = 0
  private readonly maxSize: number
  private readonly maxTotalSize: number
  private readonly ttl: number
  private readonly name: string

  constructor(name: string, maxSize = 100, maxTotalSize = 50 * 1024 * 1024, ttl = 60000) {
    this.name = name
    this.maxSize = maxSize
    this.maxTotalSize = maxTotalSize
    this.ttl = ttl
  }

  get(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const now = Date.now()
    if (now - entry.timestamp > this.ttl) {
      this.delete(key)
      return null
    }

    entry.hits++
    entry.lastAccessed = now
    return entry.data
  }

  set(key: string, data: T, tags?: string[]): void {
    const dataSize = this.estimateSize(data)
    const now = Date.now()

    this.cleanup()
    this.evictIfNeeded(dataSize)

    this.cache.set(key, {
      data,
      timestamp: now,
      size: dataSize,
      hits: 0,
      lastAccessed: now,
      tags,
    })
    this.totalSize += dataSize
  }

  delete(key: string): boolean {
    const entry = this.cache.get(key)
    if (entry) {
      this.totalSize -= entry.size
      return this.cache.delete(key)
    }
    return false
  }

  invalidateByTag(tag: string): number {
    let invalidated = 0
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags?.includes(tag)) {
        this.delete(key)
        invalidated++
      }
    }
    return invalidated
  }

  clear(): void {
    this.cache.clear()
    this.totalSize = 0
  }

  getStats() {
    const entries = Array.from(this.cache.values())
    return {
      name: this.name,
      size: this.cache.size,
      totalSize: this.totalSize,
      maxSize: this.maxSize,
      maxTotalSize: this.maxTotalSize,
      hitRate: entries.length > 0 ? entries.reduce((sum, e) => sum + e.hits, 0) / entries.length : 0,
      oldestEntry: Math.min(...entries.map((e) => e.timestamp)),
      newestEntry: Math.max(...entries.map((e) => e.timestamp)),
    }
  }

  private estimateSize(obj: T): number {
    try {
      return JSON.stringify(obj).length * 2
    } catch {
      return 1000
    }
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.delete(key)
      }
    }
  }

  private evictIfNeeded(newDataSize: number): void {
    while (
      (this.cache.size >= this.maxSize || this.totalSize + newDataSize > this.maxTotalSize) &&
      this.cache.size > 0
    ) {
      const lruKey = this.findLRUKey()
      if (lruKey) {
        this.delete(lruKey)
      } else {
        break
      }
    }
  }

  private findLRUKey(): string | null {
    let lruKey: string | null = null
    let oldestAccess = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestAccess) {
        oldestAccess = entry.lastAccessed
        lruKey = key
      }
    }

    return lruKey
  }
}
