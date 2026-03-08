import { cookies } from 'next/headers'
import RecruiterJobsClient from './jobs-client'

export default async function RecruiterJobsPage() {
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    let initialData = { jobs: [], stats: { total: 0, active: 0, draft: 0, closed: 0 } }

    if (token) {
        try {
            const activeBackendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1'
            const response = await fetch(`${activeBackendUrl}/jobs/recruiter/my-jobs`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                cache: 'no-store'
            })

            if (response.ok) {
                const data = await response.json()
                const jobsList = Array.isArray(data) ? data : (data?.jobs || [])
                initialData = {
                    jobs: jobsList,
                    stats: data?.stats || { total: 0, active: 0, draft: 0, closed: 0 }
                }
            }
        } catch (error) {
            console.error('SSR Recruiter Jobs Fetch Error:', error)
        }
    }

    return <RecruiterJobsClient initialData={initialData} />
}
