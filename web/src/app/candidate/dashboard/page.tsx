import { cookies } from 'next/headers'
import CandidateDashboardClient from './dashboard-client'

export default async function CandidateDashboardPage() {
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    let initialData = { savedJobs: [], applications: [] }

    if (token) {
        try {
            const activeBackendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1'
            const headers = { 'Authorization': `Bearer ${token}` }

            // Fetch saved jobs and applications in parallel for optimal SSR performance
            const [savedJobsRes, appsRes] = await Promise.all([
                fetch(`${activeBackendUrl}/saved-jobs/saved`, { headers, cache: 'no-store' }),
                fetch(`${activeBackendUrl}/applications/candidate`, { headers, cache: 'no-store' }).catch(() => null)
            ])

            const savedJobsData = savedJobsRes.ok ? await savedJobsRes.json() : { savedJobs: [] }
            const appsData = (appsRes && appsRes.ok) ? await appsRes.json() : { applications: [] }

            initialData = {
                savedJobs: savedJobsData.savedJobs || [],
                applications: appsData.applications || []
            }
        } catch (error) {
            console.error('SSR Candidate Dashboard Fetch Error:', error)
        }
    }

    return <CandidateDashboardClient initialData={initialData} />
}
