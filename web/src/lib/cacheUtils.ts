/**
 * Cache Management Utility Functions for Skill Match Analysis
 */

import { useSkillMatchCache } from '@/lib/useSkillMatchCache'

export function getCacheStatus() {
  const cache = getCacheFromStorage()
  return {
    totalEntries: Object.keys(cache).length,
    timestamp: new Date().toISOString()
  }
}

export function getCacheFromStorage() {
  if (typeof window === 'undefined') return {}
  
  try {
    const stored = localStorage.getItem('skill_match_analysis_cache')
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

export function formatCacheTime(timestamp: number) {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export function getAnalysisCacheInfo(jobId: string) {
  const cache = getCacheFromStorage()
  const cached = cache[jobId]
  
  if (!cached) {
    return null
  }

  return {
    analysis: cached.analysis,
    cached: cached.cached,
    cacheSource: cached.cacheSource,
    age: new Date().getTime() - cached.timestamp,
    formattedAge: formatCacheTime(cached.timestamp)
  }
}

export const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes
export const CACHE_STORAGE_KEY = 'skill_match_analysis_cache'
