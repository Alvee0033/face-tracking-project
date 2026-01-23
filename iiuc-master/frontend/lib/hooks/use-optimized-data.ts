"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface UseOptimizedDataOptions<T> {
    key: string
    fetchFn: () => Promise<T>
    interval?: number
    onSuccess?: (data: T) => void
    onError?: (error: any) => void
}

export function useOptimizedData<T>({
    key,
    fetchFn,
    interval = 10000,
    onSuccess,
    onError
}: UseOptimizedDataOptions<T>) {
    const [data, setData] = useState<T | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<any>(null)
    const [isRefetching, setIsRefetching] = useState(false)

    // Use a ref to track if component is mounted
    const mountedRef = useRef(true)

    // Load from cache initially
    useEffect(() => {
        mountedRef.current = true

        try {
            const cached = localStorage.getItem(key)
            if (cached) {
                const { data: cachedData, timestamp } = JSON.parse(cached)
                // Set cached data immediately
                setData(cachedData)
                setLoading(false)

                // Optional: If cache is too old (e.g. > 1 hour), treat as stale immediately?
                // For now, we trust cache for instant render, then refetch.
            }
        } catch (e) {
            console.warn("Failed to load from cache", e)
        }

        return () => {
            mountedRef.current = false
        }
    }, [key])

    const fetchData = useCallback(async (isBackground = false) => {
        if (!isBackground) setLoading(true)
        else setIsRefetching(true)

        try {
            const result = await fetchFn()

            if (mountedRef.current) {
                setData(result)
                setError(null)
                setLoading(false)
                setIsRefetching(false)

                // Update cache
                localStorage.setItem(key, JSON.stringify({
                    data: result,
                    timestamp: Date.now()
                }))

                if (onSuccess) onSuccess(result)
            }
        } catch (err) {
            if (mountedRef.current) {
                console.error(`Fetch error for ${key}:`, err)
                setError(err)
                setLoading(false)
                setIsRefetching(false)
                if (onError) onError(err)
            }
        }
    }, [fetchFn, key, onSuccess, onError])

    // Initial fetch (if no cache or stale)
    useEffect(() => {
        // Always fetch fresh data on mount, even if we have cache (SWR pattern)
        // Delay slightly to allow cache render first if it exists
        const timer = setTimeout(() => {
            fetchData(true)
        }, 0)

        return () => clearTimeout(timer)
    }, [fetchData])

    // Polling
    useEffect(() => {
        if (interval <= 0) return

        const timer = setInterval(() => {
            fetchData(true)
        }, interval)

        return () => clearInterval(timer)
    }, [fetchData, interval])

    // Focus revalidation
    useEffect(() => {
        const onFocus = () => fetchData(true)
        window.addEventListener('focus', onFocus)
        return () => window.removeEventListener('focus', onFocus)
    }, [fetchData])

    return { data, loading, error, isRefetching, refetch: () => fetchData(false) }
}
