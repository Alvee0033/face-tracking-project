import { useState, useCallback } from 'react'

interface OptimisticMutationOptions<TData, TVariables> {
    mutationFn: (variables: TVariables) => Promise<TData>
    onMutate?: (variables: TVariables) => void
    onSuccess?: (data: TData, variables: TVariables) => void
    onError?: (error: any, variables: TVariables) => void
    cacheKey?: string
    optimisticUpdate?: (variables: TVariables) => any
}

/**
 * Hook for optimistic mutations with automatic cache management
 * Provides instant UI updates with background server sync
 */
export function useOptimisticMutation<TData = any, TVariables = any>({
    mutationFn,
    onMutate,
    onSuccess,
    onError,
    cacheKey,
    optimisticUpdate
}: OptimisticMutationOptions<TData, TVariables>) {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<any>(null)

    const mutate = useCallback(async (variables: TVariables) => {
        setIsLoading(true)
        setError(null)

        // Store previous cache for rollback
        let previousCache: any = null

        try {
            // 1. Optimistic update (instant UI feedback)
            if (cacheKey && optimisticUpdate) {
                try {
                    const cached = localStorage.getItem(cacheKey)
                    if (cached) {
                        previousCache = JSON.parse(cached)
                    }

                    const optimisticData = optimisticUpdate(variables)
                    localStorage.setItem(cacheKey, JSON.stringify({
                        data: optimisticData,
                        timestamp: Date.now()
                    }))

                    // Force re-render by dispatching storage event
                    window.dispatchEvent(new Event('storage'))
                } catch (cacheError) {
                    console.warn('Optimistic cache update failed:', cacheError)
                }
            }

            if (onMutate) {
                onMutate(variables)
            }

            // 2. Background sync to server
            const result = await mutationFn(variables)

            // 3. Update cache with server response
            if (cacheKey) {
                localStorage.setItem(cacheKey, JSON.stringify({
                    data: result,
                    timestamp: Date.now()
                }))
                window.dispatchEvent(new Event('storage'))
            }

            if (onSuccess) {
                onSuccess(result, variables)
            }

            setIsLoading(false)
            return result

        } catch (err) {
            // Rollback optimistic update on error
            if (cacheKey && previousCache) {
                localStorage.setItem(cacheKey, JSON.stringify(previousCache))
                window.dispatchEvent(new Event('storage'))
            }

            setError(err)
            if (onError) {
                onError(err, variables)
            }
            setIsLoading(false)
            throw err
        }
    }, [mutationFn, onMutate, onSuccess, onError, cacheKey, optimisticUpdate])

    return {
        mutate,
        isLoading,
        error,
        reset: () => {
            setError(null)
            setIsLoading(false)
        }
    }
}
