import { cookies } from 'next/headers'
import ProfileClient from './profile-client'

export default async function ProfilePage() {
    // Await the cookies object
    const cookieStore = await cookies()
    const token = cookieStore.get('access_token')?.value
    let initialProfile = null

    if (token) {
        try {
            // Secure server-side fetch to the NestJS backend
            const activeBackendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api/v1'
            const response = await fetch(`${activeBackendUrl}/profiles/candidate/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                cache: 'no-store' // Always fetch fresh data on the server
            })

            if (response.ok) {
                const data = await response.json()
                initialProfile = data.profile || data
            }
        } catch (error) {
            console.error('SSR Profile Fetch Error:', error)
        }
    }

    return <ProfileClient initialProfile={initialProfile} />
}
