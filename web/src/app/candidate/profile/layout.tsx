"use client"

import { useEffect, useState } from "react"
import { ProfileSidebar } from "@/components/profile-sidebar"

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const userStr = localStorage.getItem("user")
    if (userStr) {
      try { setUser(JSON.parse(userStr)) } catch { }
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50" suppressHydrationWarning>
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Static sidebar (hidden on mobile) */}
          <div className="hidden lg:block lg:col-span-1">
            <ProfileSidebar user={user || {}} />
          </div>
          {/* Dynamic content area */}
          <div className="lg:col-span-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}


