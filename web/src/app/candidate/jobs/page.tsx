import { cookies } from 'next/headers'
import CandidateJobsClient from './jobs-client'

export default async function CandidateJobsPage() {
    let initialData = { jobs: [], totalPages: 1, currentPage: 1, totalJobs: 0 }

    try {
        const activeBackendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1'

        // Fetch public jobs list. This will hit the NestJS Redis cache.
        const response = await fetch(`${activeBackendUrl}/jobs`, {
            cache: 'no-store' // The backend handles caching
        })

        if (response.ok) {
            const data = await response.json()
            // Extract directly if data is the array, or find it in a nested structure
            if (Array.isArray(data)) {
                initialData.jobs = data as any
            } else if (data.data && Array.isArray(data.data)) {
                initialData.jobs = data.data as any
                initialData.totalJobs = data.total
                initialData.totalPages = data.totalPages
            }
        }
    } catch (error) {
        console.error('SSR Candidate Jobs Fetch Error:', error)
    }

    // Add explicit prop typing to bypass intrinsic attribute errors in TypeScript
    return <CandidateJobsClient initialData={initialData as any} />
}
