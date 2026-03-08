import { cookies } from 'next/headers'
import RecruiterDashboardClient from './dashboard-client'

export default async function RecruiterDashboardPage() {
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    let initialData = { jobs: [], stats: { total: 0, active: 0, draft: 0 } }

    if (token) {
        try {
            const activeBackendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1'
            const response = await fetch(`${activeBackendUrl}/jobs/recruiter/my-jobs?limit=5`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                cache: 'no-store' // Fetch fresh dashboard data on request
            })

            if (response.ok) {
                const data = await response.json()
                initialData = data
            }
        } catch (error) {
            console.error('SSR Recruiter Dashboard Fetch Error:', error)
        }
    }

    return <RecruiterDashboardClient initialData={initialData} />
}
