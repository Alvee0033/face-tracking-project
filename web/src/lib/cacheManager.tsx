/**
 * Cache Management Utility for Skill Match Analysis
 * Provides functions to manage and monitor skill match cache
 */

import { useSkillMatchCache } from '@/lib/useSkillMatchCache'
import { useEffect, useState } from 'react'

interface CacheStats {
  totalEntries: number
  validEntries: number
  expiredEntries: number
  cacheSize: number
  oldestEntry: number
  newestEntry: number
  memoryUsage: number
}

export function useCacheManager() {
  const { getCacheStats, getCacheMemoryUsage, clearAllCache, clearJobCache } = useSkillMatchCache()
  const [stats, setStats] = useState<CacheStats | null>(null)

  const updateStats = () => {
    const stats = getCacheStats()
    const memoryUsage = getCacheMemoryUsage()
    setStats({
      ...stats,
      memoryUsage
    })
  }

  useEffect(() => {
    updateStats()
    // Update stats every minute
    const interval = setInterval(updateStats, 60000)
    return () => clearInterval(interval)
  }, [])

  const clearCache = (jobId?: string) => {
    if (jobId) {
      clearJobCache(jobId)
    } else {
      clearAllCache()
    }
    updateStats()
  }

  return {
    stats,
    clearCache,
    updateStats
  }
}

/**
 * Debug component to show cache statistics
 * Only render in development mode
 */
export function CacheDebugPanel() {
  const { stats, clearCache } = useCacheManager()

  if (!stats || process.env.NODE_ENV !== 'development') {
    return null
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-3 rounded-lg text-xs max-w-xs z-50 font-mono shadow-lg">
      <div className="font-bold mb-2 border-b border-gray-700 pb-2">🚀 Skill Match Cache</div>
      <div className="space-y-1 text-gray-300">
        <div>📊 Total: <span className="text-blue-400">{stats.totalEntries}</span></div>
        <div>✅ Valid: <span className="text-green-400">{stats.validEntries}</span></div>
        <div>❌ Expired: <span className="text-red-400">{stats.expiredEntries}</span></div>
        <div>💾 Size: <span className="text-yellow-400">{formatBytes(stats.cacheSize)}</span></div>
        <div>📈 Memory: <span className="text-purple-400">{stats.memoryUsage}%</span></div>
      </div>
      <button
        onClick={() => clearCache()}
        className="mt-2 w-full px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs text-white"
      >
        Clear Cache
      </button>
    </div>
  )
}
