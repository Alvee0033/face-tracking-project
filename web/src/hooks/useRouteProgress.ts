import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import NProgress from 'nprogress'

export function useRouteProgress() {
    const router = useRouter()

    useEffect(() => {
        const handleStart = () => NProgress.start()
        const handleComplete = () => NProgress.done()

        // Intercept router events
        const originalPush = router.push
        const originalReplace = router.replace

        router.push = (...args: Parameters<typeof router.push>) => {
            handleStart()
            return originalPush.apply(router, args)
        }

        router.replace = (...args: Parameters<typeof router.replace>) => {
            handleStart()
            return originalReplace.apply(router, args)
        }

        return () => {
            router.push = originalPush
            router.replace = originalReplace
        }
    }, [router])
}
