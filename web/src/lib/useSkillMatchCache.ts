/**
 * Custom hook for managing Skill Match Analysis cache in memory
 * Cache expires after 30 minutes or when user navigates away
 */

import { useState, useCallback, useEffect } from 'react'

interface CachedAnalysis {
  analysis: any
  timestamp: number
  cached: boolean
  cacheSource: string
}

interface SkillMatchCache {
  [jobId: string]: CachedAnalysis
}

const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes in milliseconds
const CACHE_STORAGE_KEY = 'skill_match_analysis_cache'

/**
 * Get cache from memory/localStorage
 */
function getCache(): SkillMatchCache {
  if (typeof window === 'undefined') return {}
  
  try {
    const stored = localStorage.getItem(CACHE_STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch (error) {
    console.error('Error reading cache:', error)
    return {}
  }
}

/**
 * Save cache to localStorage
 */
function saveCache(cache: SkillMatchCache): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cache))
  } catch (error) {
    console.error('Error saving cache:', error)
    // If storage fails (quota exceeded), clear old entries
    clearExpiredCache()
  }
}

/**
 * Clear expired cache entries
 */
function clearExpiredCache(): void {
  const cache = getCache()
  const now = Date.now()
  let modified = false

  Object.keys(cache).forEach(jobId => {
    if (now - cache[jobId].timestamp > CACHE_DURATION) {
      delete cache[jobId]
      modified = true
    }
  })

  if (modified) {
    saveCache(cache)
  }
}

/**
 * Hook to manage skill match analysis cache
 */
export function useSkillMatchCache() {
  const [cache, setCache] = useState<SkillMatchCache>({})

  // Initialize cache from localStorage on mount
  useEffect(() => {
    clearExpiredCache()
    setCache(getCache())
  }, [])

  /**
   * Get cached analysis for a job
   */
  const getCachedAnalysis = useCallback((jobId: string): CachedAnalysis | null => {
    const cache = getCache()
    const cached = cache[jobId]

    if (!cached) {
      return null
    }

    const now = Date.now()
    const age = now - cached.timestamp

    // Check if cache expired
    if (age > CACHE_DURATION) {
      // Remove expired entry
      delete cache[jobId]
      saveCache(cache)
      return null
    }

    return cached
  }, [])

  /**
   * Store analysis in cache
   */
  const setCachedAnalysis = useCallback((jobId: string, analysis: any, metadata: any = {}) => {
    const cache = getCache()

    cache[jobId] = {
      analysis,
      timestamp: Date.now(),
      cached: metadata.cached || false,
      cacheSource: metadata.cacheSource || 'client-memory'
    }

    saveCache(cache)
    setCache(cache)
  }, [])

  /**
   * Clear cache for a specific job
   */
  const clearJobCache = useCallback((jobId: string) => {
    const cache = getCache()
    delete cache[jobId]
    saveCache(cache)
    setCache(cache)
  }, [])

  /**
   * Clear all cached analyses
   */
  const clearAllCache = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CACHE_STORAGE_KEY)
    }
    setCache({})
  }, [])

  /**
   * Get cache statistics
   */
  const getCacheStats = useCallback(() => {
    const cache = getCache()
    const now = Date.now()
    let validEntries = 0
    let expiredEntries = 0

    Object.keys(cache).forEach(jobId => {
      const age = now - cache[jobId].timestamp
      if (age > CACHE_DURATION) {
        expiredEntries++
      } else {
        validEntries++
      }
    })

    return {
      totalEntries: Object.keys(cache).length,
      validEntries,
      expiredEntries,
      cacheSize: new Blob([JSON.stringify(cache)]).size,
      oldestEntry: Math.min(...Object.values(cache).map(c => c.timestamp)),
      newestEntry: Math.max(...Object.values(cache).map(c => c.timestamp))
    }
  }, [])

  /**
   * Get cache memory usage percentage (estimated)
   */
  const getCacheMemoryUsage = useCallback(() => {
    const cache = getCache()
    const cacheSize = new Blob([JSON.stringify(cache)]).size
    const maxSize = 5 * 1024 * 1024 // 5MB estimated max for localStorage
    return Math.round((cacheSize / maxSize) * 100)
  }, [])

  return {
    getCachedAnalysis,
    setCachedAnalysis,
    clearJobCache,
    clearAllCache,
    getCacheStats,
    getCacheMemoryUsage,
    cache
  }
}

export type UseSkillMatchCacheReturn = ReturnType<typeof useSkillMatchCache>
