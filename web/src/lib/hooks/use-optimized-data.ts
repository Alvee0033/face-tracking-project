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

    // Refs for functions to prevent infinite loop if they are inline
    const fetchFnRef = useRef(fetchFn)
    const onSuccessRef = useRef(onSuccess)
    const onErrorRef = useRef(onError)

    // Update refs whenever the functions change
    useEffect(() => {
        fetchFnRef.current = fetchFn
        onSuccessRef.current = onSuccess
        onErrorRef.current = onError
    }, [fetchFn, onSuccess, onError])

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
            const result = await fetchFnRef.current()

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

                if (onSuccessRef.current) onSuccessRef.current(result)
            }
        } catch (err) {
            if (mountedRef.current) {
                console.error(`Fetch error for ${key}:`, err)
                setError(err)
                setLoading(false)
                setIsRefetching(false)
                if (onErrorRef.current) onErrorRef.current(err)
            }
        }
    }, [key]) // No longer depends on fetchFn, onSuccess, onError

    // Initial fetch
    useEffect(() => {
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

